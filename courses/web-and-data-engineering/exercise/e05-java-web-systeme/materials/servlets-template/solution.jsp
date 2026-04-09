<%@page contentType="text/html" pageEncoding="UTF-8"%>

<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Solution</title>
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css">
        <script src="https://code.jquery.com/jquery-1.11.3.min.js"></script>
        <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/js/bootstrap.min.js"></script>
    </head>
    <body>
        <div class="container">
                    <jsp:useBean id="result" scope="request"
                                 class="de.unipassau.currency.FinanceBean"/>
                    <div class="alert alert-info" role="alert">
                        <span class="glyphicon glyphicon-piggy-bank" aria-hidden="true"></span>
                        ${result.value} ${result.currency} 
                    </div>
            <p>
                <a href="index.html" class="btn btn-primary">Zurück</a>
            </p>
        </div>
    </body>
</html>
