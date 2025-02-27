import jwt from "jsonwebtoken"
import dotenv from "dotenv"
dotenv.config();
import { notFoundResponse, unAuthorizedResponse } from '../utils/response.js';

const authenticateToken = async (req, res, next) => {
    let token = req.body.token || req.params.token || req.headers['x-access-token'] || req.headers['authorization'] || req.headers['Authorization'];
    if (!token) {
        return unAuthorizedResponse(res, "", "Please send token in payload or x-access-token header or authorization header.");
    }
    try {
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return notFoundResponse(res, err, `JWT verification failed`);
            } else {
                // Check the expiration time (exp claim) of the JWT
                const currentTimeInSeconds = Math.floor(Date.now() / 1000);
                if (decoded.exp && currentTimeInSeconds > decoded.exp) {
                    return notFoundResponse(res, err, `JWT has expired`);;
                } else {
                    req.decoded = decoded;
                    next();
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

export default authenticateToken;