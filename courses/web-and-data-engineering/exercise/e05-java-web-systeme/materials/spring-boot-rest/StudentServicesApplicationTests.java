package edu.de.uni.passau.webeng.students;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.test.context.junit4.SpringRunner;

import static org.junit.Assert.*;

@RunWith(SpringRunner.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
public class StudentServicesApplicationTests {

    // Manuelle Anfragen:
    // curl -w "\n" localhost:8080/students/34622/
    // curl -w "\n" localhost:8080/students/34622/courses/
    // curl -X POST -w "\n" localhost:8080/students/34622/courses/

    @Autowired
    private TestRestTemplate restTemplate;

	@Test
	public void getStudentTest() {
        assertEquals("{\"matrNr\":34622,\"firstName\":\"Hans\",\"lastName\":\"Muster\"}",
                restTemplate.getForObject("/students/34622/", String.class));
	}

    @Test
    public void registerForCourseTest() {

	    // Expected to fail cause of missing prerequisite
        assertTrue(restTemplate.postForObject("/students/23328/courses/c4",
                null, String.class).contains("\"status\":403"));

        // Student shouldn't contain c2 now
        assertTrue(!restTemplate.getForObject("/students/23328/courses/", String.class).contains("c4"));

        // No error response expected
        assertNull(restTemplate.postForObject("/students/23328/courses/c2", null, String.class));

        // Student should contain c2 now
        assertTrue(restTemplate.getForObject("/students/23328/courses/", String.class).contains("c2"));
    }
}
