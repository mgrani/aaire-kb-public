package edu.de.uni.passau.webeng.students.application.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class NotFoundException extends RuntimeException {
    public NotFoundException(String type, String id) {
        super("Resource of type " + type + " with id " + id + " not found.");
    }
}
