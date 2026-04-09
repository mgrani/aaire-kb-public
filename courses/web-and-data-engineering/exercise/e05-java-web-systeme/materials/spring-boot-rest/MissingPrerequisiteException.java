package edu.de.uni.passau.webeng.students.application.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class MissingPrerequisiteException extends RuntimeException {
    public MissingPrerequisiteException(String name) {
        super("Student is missing prerequisite " + name);
    }
}
