
export interface RegisterInput {
  /** @minLength 2 */
  name: string;
  email: string;
  /** @minLength 8 */
  password: string;
}
