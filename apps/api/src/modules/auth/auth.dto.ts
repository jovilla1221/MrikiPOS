import { IsString, Matches, Length, IsEnum } from 'class-validator';

export enum OtpType {
  REGISTER = 'register',
  LOGIN = 'login',
  FORGOT_PIN = 'forgot_pin',
}

export class RegisterDto {
  @IsString()
  @Length(2, 100, { message: 'Nama harus 2-100 karakter' })
  nama!: string;

  @IsString()
  @Matches(/^08[0-9]{8,12}$/, { message: 'Nomor HP harus diawali 08 dan 10-14 digit' })
  phone!: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'PIN harus tepat 6 digit angka' })
  pin!: string;

  @IsString()
  @Length(2, 100, { message: 'Nama usaha harus 2-100 karakter' })
  nama_usaha!: string;
}

export class LoginDto {
  @IsString()
  @Matches(/^08[0-9]{8,12}$/, { message: 'Nomor HP harus diawali 08 dan 10-14 digit' })
  phone!: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'PIN harus tepat 6 digit angka' })
  pin!: string;
}

export class OtpSendDto {
  @IsString()
  @Matches(/^08[0-9]{8,12}$/, { message: 'Nomor HP harus diawali 08 dan 10-14 digit' })
  phone!: string;

  @IsEnum(OtpType, { message: 'Tipe OTP harus register, login, atau forgot_pin' })
  type!: OtpType;
}

export class OtpVerifyDto {
  @IsString()
  @Matches(/^08[0-9]{8,12}$/, { message: 'Nomor HP harus diawali 08 dan 10-14 digit' })
  phone!: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'Kode OTP harus 6 digit' })
  code!: string;

  @IsEnum(OtpType, { message: 'Tipe OTP harus register, login, atau forgot_pin' })
  type!: OtpType;
}

export class RefreshDto {
  @IsString()
  refresh_token!: string;
}

export class ForgotPinDto {
  @IsString()
  @Matches(/^08[0-9]{8,12}$/, { message: 'Nomor HP harus diawali 08 dan 10-14 digit' })
  phone!: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'Kode OTP harus 6 digit' })
  code!: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'PIN baru harus 6 digit angka' })
  new_pin!: string;
}
