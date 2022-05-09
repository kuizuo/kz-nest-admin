import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  async sendEmail(to, subject, content): Promise<any> {
    const info = {
      to: to,
      from: this.configService.get<string>('email.user'),
      subject: subject,
      text: content,
    };
    return await this.mailerService.sendMail(info);
  }

  async sendCodeMail(user, code) {
    const subject = '【泰迪】';
    const content = `尊敬的用户您好，您的验证码是${code}，请于5分钟内输入。`;
    const ret = await this.sendEmail(user.email, subject, content);

    if (!ret) return '发送验证码失败';
    return '发送邮箱验证码成功，请在5分钟内输入';
  }

  async sendActivateMail(to, username, token) {
    const subject = '【泰迪】激活邮箱账号';
    const content = `尊敬的${username}，您好！
     感谢您注册，请您在24小时内点击下方链接，完成账号邮箱验证。
     ${this.configService.get<string>('email.domain')}/v1/user/activateMail?token=${token}
     激活后即可使用!`;
    return await this.sendEmail(to, subject, content);
  }
}
