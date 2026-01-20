export const jwtConstants = {
  secret: process.env.JWT_SECRET || 'jwt_secret',
  expiresIn: '7d',
};
