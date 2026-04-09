package edu.de.uni.passau.webeng.students.web.controller;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.PropertySource;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

// Example class for property access
@RestController
@PropertySource("classpath:config.properties")
public class GenericController {

//    2) Alternative property access
//    @Value("${name}")
//    private String name;

    //    1) Accessing property data in config.properties
    private final Environment environment;

    @Autowired
    public GenericController(Environment environment) {
        this.environment = environment;
    }

    @GetMapping(path = "/name")
    public String getName() {
        return environment.getProperty("name");
    }
}
