// Client-side checks for the new-password forms; the server re-validates with passwordSchema.
export const validateNewPassword = {
  password: (v: string) => (v.length >= 8 ? null : "Use at least 8 characters"),
  confirm: (v: string, values: { password: string }) =>
    v === values.password ? null : "The passwords don't match",
};
