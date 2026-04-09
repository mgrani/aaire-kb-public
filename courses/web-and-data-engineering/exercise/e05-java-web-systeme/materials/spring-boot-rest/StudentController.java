package edu.de.uni.passau.webeng.students.web.controller;

import com.fasterxml.jackson.annotation.JsonBackReference;
import edu.de.uni.passau.webeng.students.application.service.StudentService;
import edu.de.uni.passau.webeng.students.web.dto.CourseDto;
import edu.de.uni.passau.webeng.students.web.dto.StudentDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;

@RestController
@RequestMapping(value = "/students")
public class StudentController {
    private final StudentService studentService;

    @Autowired
    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping(path = "/{id}")
    public StudentDto getStudent(@PathVariable("id") String id) {
        return studentService.getStudent(id);
    }

    @GetMapping(path = "/{id}/courses")
    public List<CourseDto> getCoursesOfStudent(@PathVariable("id") String id) {
        return studentService.getCoursesOfStudent(id);
    }

    @PostMapping(path = "/{id}/courses/{cid}")
    public ResponseEntity<?> registerForCourse(@PathVariable("id") String id, @PathVariable("cid") String cid,
                                               UriComponentsBuilder b) {
        studentService.registerForCourse(id, cid);
        UriComponents uriComponents =
                b.path("/{id}/courses/{cid}").buildAndExpand(id, cid);
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(uriComponents.toUri());
        return new ResponseEntity<Void>(headers, HttpStatus.CREATED);
    }
}
