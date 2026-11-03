export const PASSWORD_REQUIREMENTS_PATTERN =
  "(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,128}";

export const hasStrongPassword = (password: string) =>
  new RegExp(`^${PASSWORD_REQUIREMENTS_PATTERN}$`).test(password);
