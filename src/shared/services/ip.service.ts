import Http from '@/utils/Http.class';
import { Injectable } from '@nestjs/common';
import * as iconv from 'iconv-lite';

@Injectable()
export class IpService {
  private http: Http;

  constructor() {
    this.http = new Http();
  }

  async getAddress(ip: string) {
    const res = await this.http.get('http://whois.pconline.com.cn/ipJson.jsp?json=true&ip=' + ip, {
      responseType: 'arraybuffer',
      transformResponse: [(data) => JSON.parse(iconv.decode(data, 'gbk'))],
    });
    return res.data.addr;
  }
}
