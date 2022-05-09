import Http from '@/utils/Http.class';
import { Injectable } from '@nestjs/common';

@Injectable()
export class QQService {
  private http: Http;

  constructor() {
    this.http = new Http();
  }

  async getNickname(qq: string | number) {
    const res = await this.http.get('https://res.abeim.cn/api-qq.name?qq=' + qq);
    return res.data.name;
  }

  async getAvater(qq: string | number) {
    return `https://q1.qlogo.cn/g?b=qq&s=100&nk=${qq}`;
  }
}
