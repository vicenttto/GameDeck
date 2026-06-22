package com.tfg.gamelist.common.exception;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    /** Compatibilidad con el constructor original (asume BAD_REQUEST). */
    public ApiException(String message) {
        this(HttpStatus.BAD_REQUEST, message);
    }

    public HttpStatus getStatus() {
        return status;
    }
}
