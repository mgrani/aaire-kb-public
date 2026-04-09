package de.unipassau.currency;

import static org.junit.Assert.*;
import java.io.*;
import javax.servlet.http.*;
import org.apache.commons.io.FileUtils;
import org.junit.Test;
import org.mockito.Mockito;

public class TestCurrencyServlet extends Mockito {
    @Test
    public void testServlet() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        when(request.getParameter("base")).thenReturn("EUR");
        when(request.getParameter("symbols")).thenReturn("CHF,USD");

        StringWriter stringWriter = new StringWriter();
        PrintWriter writer = new PrintWriter(stringWriter);
        when(response.getWriter()).thenReturn(writer);

        new CurrencyServlet().doGet(request, response);

        //verify(request, atLeast(1)).getParameter("base");
        writer.flush(); // it may not have been flushed yet...
        assertTrue(stringWriter.toString().contains("rates"));
    }
}