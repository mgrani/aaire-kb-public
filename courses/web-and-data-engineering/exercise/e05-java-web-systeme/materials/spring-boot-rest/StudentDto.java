package edu.de.uni.passau.webeng.students.web.dto;

public class StudentDto {
    private Long matrNr;
    private String firstName;
    private String lastName;

    public Long getMatrNr() {
        return matrNr;
    }

    public void setMatrNr(Long matrNr) {
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
}
