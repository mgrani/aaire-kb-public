package edu.de.uni.passau.webeng.students.model;

import java.util.LinkedList;
import java.util.List;

public class Student {
    private String matrNr;
    private String firstName;
    private String lastName;
    private List<Course> courses;
    private List<Course> finishedCourses;

    public Student(String matrNr, String firstName, String lastName, List<Course> courses, List<Course> finishedCourses) {
        this.matrNr = matrNr;
        this.firstName = firstName;
        this.lastName = lastName;
        this.courses = courses != null ? courses : new LinkedList<>();
        this.finishedCourses = finishedCourses != null ? finishedCourses : new LinkedList<>();
    }

    public String getMatrNr() {
        return matrNr;
    }

    public void setMatrNr(String matrNr) {
        this.matrNr = matrNr;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public List<Course> getCourses() {
        return courses;
    }

    public void setCourses(List<Course> courses) {
        this.courses = courses;
    }

    public void addCourse(Course course) {
        this.courses.add(course);
    }

    public List<Course> getFinishedCourses() {
        return finishedCourses;
    }

    public void setFinishedCourses(List<Course> finishedCourses) {
        this.finishedCourses = finishedCourses;
    }
}