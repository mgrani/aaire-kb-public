package de.unipassau.currency;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import java.io.*;
import java.util.*;


@SuppressWarnings("ALL")
@WebServlet(urlPatterns = {"/currency"})
public class CurrencyServlet extends HttpServlet {

    private static String ratesCsv = "Date, USD, JPY, BGN, CZK, DKK, GBP, HUF, PLN, RON, SEK, CHF, ISK, NOK, HRK, RUB, TRY, AUD, BRL, CAD, CNY, HKD, IDR, ILS, INR, KRW, MXN, MYR, NZD, PHP, SGD, THB, ZAR, \n" +
            "22 May 2020, 1.0904, 117.26, 1.9558, 27.210, 7.4578, 0.89563, 349.40, 4.5209, 4.8435, 10.5373, 1.0591, 156.30, 10.9078, 7.5845, 77.9139, 7.4227, 1.6694, 6.0857, 1.5273, 7.7797, 8.4571, 16249.14, 3.8459, 82.7265, 1353.51, 25.0450, 4.7569, 1.7870, 55.349, 1.5521, 34.778, 19.2476, \n";

    private static HashMap<String, Double> loadRates() {
        List<List<String>> records = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new StringReader(ratesCsv))) {
            String line;
            while ((line = br.readLine()) != null) {
                String[] values = line.split(",");
                records.add(Arrays.asList(values));
            }
        } catch (IOException e) {
            e.printStackTrace();
        }

        HashMap<String, Double> rates = new HashMap<>();
        for (int i = 1; i < records.get(0).size(); i++) {
            String label = records.get(0).get(i).trim().toLowerCase();
                if (!label.equals("")) {
                    try {
                        Double rate = Double.valueOf(records.get(1).get(i).trim());
                        rates.put(label, rate);
                    } catch (NumberFormatException e) {
                        e.printStackTrace();
                    }
                }
        }
        return rates;
    }

    private HashMap<String, Double> rates = loadRates();

    private double getRate(String from, String to) {

        if (from.equalsIgnoreCase(to)) {
            return 1;
        } else if (from.equalsIgnoreCase("EUR")) {
            return rates.get(to.toLowerCase());
        } else if (to.equalsIgnoreCase("EUR")) {
            return (1 / rates.get(from.toLowerCase()));
        } else {
            // Calculate to euro and then to foreign currency
            return (1 / rates.get(from.toLowerCase())) * rates.get(to.toLowerCase());
        }
    }

    // Aufgabe 1 a)
    protected void doGet(javax.servlet.http.HttpServletRequest request,
                         javax.servlet.http.HttpServletResponse response) throws IOException {

        response.setContentType("application/json");
        PrintWriter out = response.getWriter();

        String base = request.getParameterMap().containsKey("base") ? request.getParameter("base") : "EUR";
        String symbols = request.getParameterMap().containsKey("symbols") ? request.getParameter("symbols") : "USD";

        String[] symbolSplits = symbols.split(",");

        // Start json object
        out.print("{\"rates\": {");

        // For each rate we have to add
        for (int i = 0; i < symbolSplits.length; i++) {
            String symbol = symbolSplits[i];
            out.print("\"" + symbol + "\": " + getRate(base, symbol));

            // Add comma if there are more symbols
            if (i < symbolSplits.length -1) {
                out.print(",");
            }
        }

        // End json object and add line break
        out.print("}}\n");
    }

    // Aufgabe 2 b)
    protected void doPost(javax.servlet.http.HttpServletRequest request,
                          javax.servlet.http.HttpServletResponse response)
            throws javax.servlet.ServletException, IOException {
        String from = request.getParameter("from");
        String to = request.getParameter("to");
        double value = Double.parseDouble(request.getParameter("value"));

        // Aufgabe 2 c)
        // calculate and save the results as attribute to read it later in view
        request.setAttribute("result", new FinanceBean(value * getRate(from, to), to));

        // Aufgabe 2 d)
        // show view
        request.getRequestDispatcher("solution.jsp").forward(request, response);
    }
}
