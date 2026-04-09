package edu.de.uni.passau.webeng.students.web.controller;

import edu.de.uni.passau.webeng.students.application.service.StudentService;
import edu.de.uni.passau.webeng.students.web.dto.StudentDto;
import org.hamcrest.Matchers;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@RunWith(SpringRunner.class)
@WebMvcTest(value = StudentController.class, secure = false)
public class StudentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StudentService studentService;

    // UnitTest

    @Test
    public void getStudentTest() throws Exception {
        StudentDto studentDto = new StudentDto();
        studentDto.setMatrNr(34622L);

        // Mockito um die Reaktion des MockServices zu definieren
        given(studentService.getStudent("34622")).willReturn(studentDto);

        // Sende get an den Controller
        mockMvc.perform(get("/students/34622/"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matrNr", Matchers.equalTo(34622)));
    }

    @Test
    public void registerForCourseTest() throws Exception {
        mockMvc.perform(post("/students/34622/courses/c3"))
                .andDo(print())
                .andExpect(status().isCreated()).andExpect(header().string("location",
                "http://localhost/34622/courses/c3"));
    }
}
