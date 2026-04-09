package edu.de.uni.passau.webeng.students.application.init;

import edu.de.uni.passau.webeng.students.application.service.StudentService;
import edu.de.uni.passau.webeng.students.model.Course;
import edu.de.uni.passau.webeng.students.model.Student;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.LinkedList;
import java.util.List;

@Component
public class DataInit implements CommandLineRunner {

    private final StudentService studentService;

    @Autowired
    public DataInit(StudentService studentService) {
        this.studentService = studentService;
    }

    @Override
    public void run(String... strings) throws Exception {
        // Initializes the data of our model
        Course course0 = new Course("c0", "JSF", "Learn JSF.", null);
        Course course1 = new Course("c1", "Maven", "One of the most popular dependency management tools.", null);
        Course course2 = new Course("c2", "Web Servers", "Learn about web servers.", null);

        List<Course> courseList0 = new LinkedList<>();
        courseList0.add(course1);
        courseList0.add(course2);
        Course course3 = new Course("c3", "Spring Boot", "Use Spring Boot to bootstrap servers.", courseList0);

        List<Course> courseList1 = new LinkedList<>();
        courseList1.addAll(courseList0);
        courseList1.add(course3);
        Course course4 = new Course("c4", "Spring Data", "A course about data persistence on the server.", courseList1);

        studentService.addCourse(course0);
        studentService.addCourse(course1);
        studentService.addCourse(course2);
        studentService.addCourse(course3);
        studentService.addCourse(course4);

        List<Course> courseList2 = new LinkedList<>();
        courseList2.add(course0);
        courseList2.add(course1);

        List<Course> courseList3 = new LinkedList<>();
        courseList3.add(course3);

        List<Course> courseList4 = new LinkedList<>();
        courseList4.add(course0);

        Student student0 = new Student("23328", "Max", "Muster", courseList2, null);
        Student student1 = new Student("34622", "Hans", "Muster", courseList3, courseList0);
        Student student2 = new Student("48645", "Alice", "Klint", courseList4, courseList0);
        Student student3 = new Student("24232", "Bob", "Ser", null, courseList1);

        studentService.addStudent(student0);
        studentService.addStudent(student1);
        studentService.addStudent(student2);
        studentService.addStudent(student3);
    }
}
