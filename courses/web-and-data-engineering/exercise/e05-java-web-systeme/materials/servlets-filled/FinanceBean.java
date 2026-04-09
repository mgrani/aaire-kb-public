package de.unipassau.currency;

import java.io.Serializable;

// Aufgabe 2 a)
/**
 * Bean for encapsulating currency and value
 */
public class FinanceBean implements Serializable {

    private double value;
    private String currency = "";

    public FinanceBean() {
    }

    public FinanceBean(double value, String currency) {
        this.value = value;
        this.currency = currency;
    }

    public double getValue() {
        return value;
    }

    public void setValue(double value) {
        this.value = value;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

}