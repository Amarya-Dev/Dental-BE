
import crypto from "crypto"
const secretKey = process.env.TOKENSECRET


export function generateToken() {
    const token = crypto.randomBytes(20).toString('hex');
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(token);
    const hashedToken = hmac.digest('hex');
    return hashedToken;
}