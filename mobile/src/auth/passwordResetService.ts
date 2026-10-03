/**
 * The existing backend exposes no password-reset endpoints. These methods are
 * intentionally non-networked so the app never pretends that an OTP was sent.
 * Replace them with documented API calls only after the backend contract exists.
 */
export class PasswordResetApiUnavailableError extends Error {
  constructor() {
    super("Máy chủ chưa hỗ trợ chức năng quên mật khẩu. Vui lòng liên hệ BeautyStore để được hỗ trợ.");
  }
}

export const passwordResetService = {
  async requestOtp(_identifier: string): Promise<never> { throw new PasswordResetApiUnavailableError(); },
  async verifyOtp(_identifier: string, _otp: string): Promise<never> { throw new PasswordResetApiUnavailableError(); },
  async resetPassword(_identifier: string, _otp: string, _password: string): Promise<never> { throw new PasswordResetApiUnavailableError(); },
};
