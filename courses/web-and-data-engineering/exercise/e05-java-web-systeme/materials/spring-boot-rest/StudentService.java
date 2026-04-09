package edu.de.uni.passau.webeng.students.application.service;

import edu.de.uni.passau.webeng.students.application.exception.MissingPrerequisiteException;
import edu.de.uni.passau.webeng.students.application.exception.NotFoundException;
import edu.de.uni.passau.webeng.students.model.Course;
import edu.de.uni.passau.webeng.students.model.Student;
import edu.de.uni.passau.webeng.students.web.dto.CourseDto;
import edu.de.uni.passau.webeng.students.web.dto.StudentDto;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;

@Service
public class StudentService {

	private static List<Student> students = new ArrayList<>();
	private static List<Course> courses = new ArrayList<>();

    public StudentDto getStudent(String id) {

        // Find and return the student of given id
        for (Student student : students) {
            if (student.getMatrNr().equals(id)) {
                return convertToDto(student);
            }
        }
        throw new NotFoundException("Student", id);
    }

    public List<CourseDto> getCoursesOfStudent(String id) {

	    // Find the student of given id
        for (Student student : students) {
            if (student.getMatrNr().equals(id)) {

                // Convert his Courses to a List of DTOs
                List<CourseDto> courses = new LinkedList<>();
                for (Course course : student.getCourses()) {
                    courses.add(convertToDto(course));
                }
                return courses;
            }
        }
        throw new NotFoundException("Student", id);
    }

    public void registerForCourse(String id, String cid) {

	    // Find the student of given id
	    Student student = null;
        for (Student s : students) {
            if (s.getMatrNr().equals(id)) {
                student = s;
                break;
            }
        }

        // Fail if no student of given id exists
        if (student == null)
            throw new NotFoundException("Student", id);

        // Find the course of given id
        Course course = null;
        for (Course c : courses) {
            if (c.getId().equals(cid)) {
                course = c;
                break;
            }
        }

        // Fail if no course of given id exists
        if (course == null)
            throw new NotFoundException("Course", cid);

        // Fail if prerequisite is not finished
        for (Course prerequisite : course.getPrerequisites()) {
            if (!student.getFinishedCourses().contains(prerequisite))
                throw new MissingPrerequisiteException(prerequisite.getTitle());
        }

        // Register for the course
        student.addCourse(course);
    }

    private StudentDto convertToDto(Student student) {
	    StudentDto dto = new StudentDto();
        dto.setMatrNr(Long.valueOf(student.getMatrNr()));
        dto.setFirstName(student.getFirstName());
        dto.setLastName(student.getLastName());
        return dto;
    }

    private CourseDto convertToDto(Course course) {
	    CourseDto dto = new CourseDto();
        dto.setId(course.getId());
        dto.setTitle(course.getTitle());
        dto.setDescription(course.getDescription());

        // recursively get prerequisites
        List<CourseDto> prerequisites = new LinkedList<>();
        for (Course c : course.getPrerequisites()) {
            prerequisites.add(convertToDto(c));
        }
        dto.setPrerequisites(prerequisites);
        return dto;
    }

    public void addStudent(Student student) {
        students.add(student);
    }

    public void addCourse(Course course) {
        courses.add(course);
    }
}