// Wrapper buat async route handlers
// Auto catch errors tanpa perlu try-catch manual di tiap route
// Jadi kode lebih bersih dan ga perlu copas try-catch terus
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Centralized error handler middleware
// Semua error bakal lewat sini sebelum dikirim ke client
export const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err.message);

    //500 error kalo ga ada status code spesifik
    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
