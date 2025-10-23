class ApiResponse {
    constructor(success, message, data, errors) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.errors = errors;
    }

    successResponse(data = null, message = "")
    {
        this.success = true;
        this.data = data;
        this.message = message;
        this.errors = []
        return {
            success: this.success,
            message: this.message,
            data: this.data,
            errors: this.errors
        };
    }

    errorResponse(message = "", errors = null)
    {
        this.success = false;
        this.data = [];
        this.message = message;
        this.errors = Array.isArray(errors) ? errors : [errors];
        return {
            success: this.success,
            message: this.message,
            data: this.data,
            errors: this.errors
        };
    }

}
module.exports = ApiResponse;