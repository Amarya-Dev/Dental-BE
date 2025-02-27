export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({ success: true, message, data });
};

export const notFoundResponse = (res, data, message = 'Not Found', statusCode = 404) => {
    return res.status(statusCode).json({ success: false, message, data });
};
export const unAuthorizedResponse = (res, data, message = 'Not Found', statusCode = 401) => {
    return res.status(statusCode).json({ success: false, message, data });
};
export const errorResponse = (res, errors, message = 'Not Found', statusCode = 400) => {
    return res.status(statusCode).json({ success: false, message, errors });
};

export const error5Response = (res, errors, message = 'Error', statusCode = 500) => {
    return res.status(statusCode).json({ success: false, message, errors });
};