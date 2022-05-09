import axios, { AxiosInstance, AxiosProxyConfig, AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import urllib from 'url';
import http from 'http';
import https from 'https';
import tunnel from 'tunnel';

const UserAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:80.0) Gecko/20100101 Firefox/80.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.30 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/13.10586',
];

export interface Header {
  Origin?: string;
  Referer?: string;
  Cookie?: string | object;
  'User-Agent'?: string;
  Connection?: string;
  [propName: string]: any;
}

export interface Response<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Header;
  location?: string;
  cookies?: object;
  config: AxiosRequestConfig;
  request?: any;
}

export default class Http {
  public instance: AxiosInstance;
  public auto = false; // 自动补全协议头
  public cookies: any = {};
  public headers: Header = {}; // 自带协议头  后续都必须要带上
  public redirect = true; // 默认允许重定向
  protected proxy: AxiosProxyConfig;

  constructor(
    auto?: boolean,
    retryConfig = {
      retry: 2,
      delay: 200,
    },
  ) {
    this.auto = auto;
    this.instance = axios.create();
    this.instance.defaults.timeout = 60 * 1000;

    if (retryConfig) {
      axiosRetry(this.instance, {
        retries: retryConfig.retry, // 设置自动发送请求次数
        shouldResetTimeout: true, // 重置超时时间
        retryDelay: (retryCount) => {
          return retryCount * retryConfig.delay; // 重复请求延迟
        },
        retryCondition: (error) => {
          // if (axiosRetry.isNetworkOrIdempotentRequestError(error)) {
          //   return true
          // }
          if (['ECONNRESET', 'ETIMEDOUT'].includes(error.code)) {
            // , 'ENOTFOUND'
            return true;
          }
          if (error.code == 'ECONNABORTED' && error.message.indexOf('timeout') != -1) {
            return true;
          }

          return false;
        },
      });
    }

    this.instance.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.resolve(error);
      },
    );

    this.instance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error?.response) {
          const response: AxiosResponse = error.response;

          return Promise.resolve(response);
        } else {
          // let config = error.config;
          // if (error.code == 'ETIMEDOUT' && !config._retry) {
          //   config._retry = true
          //   return this.instance.request(config);
          // }
          return Promise.reject(error?.message);
        }
      },
    );
  }

  async request(config: AxiosRequestConfig): Promise<Response<any>> {
    return new Promise((resolve, reject) => {
      const { url, headers } = config;
      if (!url) reject('Please fill in the url');

      if (!headers) config.headers = {};

      // 如果携带了自定义cookie则不是已有Cookies
      const cookie = config.headers?.['Cookie'];
      if (cookie) {
        config.headers['Cookie'] = typeof cookie == 'string' ? cookies2Obj(cookie) : cookie;
      } else {
        if (obj2Cookies(this.cookies)) config.headers['Cookie'] = obj2Cookies(this.cookies);
      }

      if (this.auto) {
        const { protocol, host, pathname } = urllib.parse(url);
        if (!config.headers['Referer']) {
          config.headers['Referer'] = protocol + '//' + host + pathname;
        }
        if (!config.headers['Origin']) {
          config.headers['Origin'] = protocol + '//' + host;
        }
      }

      // 总协议头与请求的合并  例如JWT效验的Authentication 当然也可通过拦截器来实现
      const _headers = { ...this.headers, ...config.headers };

      const setting: AxiosRequestConfig = {
        ...config,
        headers: _headers,
        withCredentials: true,
        maxRedirects: 0, // this.redirect ? 5 : 0, // 始终禁止要重定向
        httpAgent: new http.Agent({ keepAlive: true }),
        httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
        validateStatus: function () {
          return true;
        },
      };

      if (this.proxy && !config.proxy) {
        config.proxy = this.proxy;
      }

      if (config.proxy) {
        setting.proxy = false;
        setting.httpAgent = tunnel.httpOverHttp({ proxy: this.proxy });
        // 切记不可设置httpsAgent 不然就会出现 tunneling socket could not be established, cause=Hostname/IP does not
        // setting.httpsAgent = tunnel.httpsOverHttp({ proxy: this.proxy })
      }

      this.instance
        .request(setting)
        .then(async (res) => {
          if (res.headers?.['set-cookie']) {
            const cookies = res.headers['set-cookie']
              .map((x) => x.split(';')[0])
              .reduce(
                (a, val) => (
                  (a[val.slice(0, val.indexOf('=')).trim()] = val
                    .slice(val.indexOf('=') + 1)
                    .trim()),
                  a
                ),
                {},
              );

            this.cookies = { ...this.cookies, ...cookies };
            res['cookies'] = this.cookies;
          }

          if ([301, 302, 303].includes(res.status)) {
            // 禁止了重定向，则返回响应中的location 否则重新请求直到不为重定向代码
            const location: string = res.headers['location'] || '';
            if (location) {
              if (this.redirect) {
                const res = await this.request({ ...setting, url: location });
                resolve(res);
              } else {
                res['location'] = location;
              }
            }
          }
          resolve(res);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  async get(url: string, config?: AxiosRequestConfig): Promise<Response<any>> {
    return this.request({
      url,
      method: 'GET',
      ...config,
    });
  }

  async post(url: string, data: any, config?: AxiosRequestConfig): Promise<Response<any>> {
    return this.request({
      url,
      method: 'POST',
      data,
      ...config,
    });
  }

  async put(url: string, data: any, config?: AxiosRequestConfig): Promise<Response<any>> {
    return this.request({
      url,
      method: 'PUT',
      data,
      ...config,
    });
  }

  async delete(url: string, config?: AxiosRequestConfig): Promise<Response<any>> {
    return this.request({
      url,
      method: 'DELETE',
      ...config,
    });
  }

  /**
   * 初始化浏览器UA信息
   */
  init() {
    this.headers['User-Agent'] =
      UserAgents[Math.round(Math.random() * UserAgents.length)] ||
      'User-Agent: Mozilla/5.0 (Windows NT 6.1; WOW64; rv:46.0) Gecko/20100101 Firefox/46.0';
    this.headers['Accept-Language'] = 'zh-CN,zh;q=0.9';

    this.headers['Accept-Encoding'] = 'gzip, deflate';
    this.headers['Connection'] = 'keep-alive';
  }

  setCookies(cookies?: string | object) {
    if (!cookies) {
      delete this.headers['Cookie'];
      delete this.cookies;
      return;
    }
    if (typeof cookies === 'string') {
      this.headers['Cookie'] = cookies;
    } else {
      this.headers['Cookie'] = obj2Cookies(cookies);
    }
  }

  setHeader(key: string, val = '') {
    if (val) {
      this.headers[key] = val;
    } else {
      delete this.headers[key];
    }
  }

  setHeaders(headers: Header) {
    Object.keys(headers).forEach((h) => {
      if (headers[h]) {
        this.headers[h] = headers[h];
      } else {
        delete this.headers[h];
      }
    });
  }

  setUserAgent(userAgent: string) {
    this.headers['User-Agent'] = userAgent;
  }

  setFakeIP(ip: string) {
    ip = ip ?? getFakeIP();
    this.headers['Client-Ip'] = ip;
    this.headers['X-Forwarded-For'] = ip;
    this.headers['Remote_Addr'] = ip;
  }

  setProxy(p?: string | null) {
    if (p) {
      if (typeof p === 'string') {
        const proxy: AxiosProxyConfig = {
          host: p.split(':')[0],
          port: Number(p.split(':')[1]),
        };
        this.proxy = proxy;
      } else {
        this.proxy = p;
      }
    } else {
      this.proxy = null;
    }
  }
}

export function cookies2Obj(cookies: string): any {
  return cookies
    .split('; ')
    .reduce(
      (a, val) => (
        (a[val.slice(0, val.indexOf('=')).trim()] = val.slice(val.indexOf('=') + 1).trim()), a
      ),
      {},
    );
}

export function obj2Cookies(obj) {
  return Object.keys(obj)
    .map((key) => key + '=' + obj[key])
    .join('; ');
}

export function mergeCookie(c1, c2) {
  c1 = typeof c1 == 'string' ? cookies2Obj(c1) : c1;
  c2 = typeof c2 == 'string' ? cookies2Obj(c2) : c2;
  return { ...c1, ...c2 };
}

export function getFakeIP() {
  const a = Math.round(Math.random() * 250) + 1,
    b = Math.round(Math.random() * 250) + 1,
    c = Math.round(Math.random() * 240) + 1,
    d = Math.round(Math.random() * 240) + 1;
  return [a, b, c, d].join('.');
}
