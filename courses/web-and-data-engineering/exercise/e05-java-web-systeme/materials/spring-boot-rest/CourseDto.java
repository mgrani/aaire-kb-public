package edu.de.uni.passau.webeng.students.web.dto;

import java.util.List;

public class CourseDto {
    private String id;
    private String title;
    private String description;
    private List<CourseDto> prerequisites;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<CourseDto> getPrerequisites() {
        return prerequisites;
    }

    public void addPrerequisites(CourseDto course) {
        prerequisites.add(course);
    }

    public void setPrerequisites(List<CourseDto> prerequisites) {
        this.prerequisites = prerequisites;
    }
}
