package de.unipassau.currency;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import java.io.*;
import java.util.*;


@SuppressWarnings("ALL")
@WebServlet(urlPatterns = {"/currency"})
public class CurrencyServlet extends HttpServlet {
    // Aufgabe 1 a)
    protected void doGet(javax.servlet.http.HttpServletRequest request,
                         javax.servlet.http.HttpServletResponse response) throws IOException {
        response.setContentType("application/json");
        PrintWriter out = response.getWriter();

        // Your Code Here

        // Return result
        out.print("Hello World\n");
    }

    // Aufgabe 2 b)
    protected void doPost(javax.servlet.http.HttpServletRequest request,
                          javax.servlet.http.HttpServletResponse response)
            throws javax.servlet.ServletException, IOException {
        String from = request.getParameter("from");

    }
}
