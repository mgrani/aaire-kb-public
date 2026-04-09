// takes arbitrary value and returns output strings depending on validity
export function validate_number(value) {
  // accept only digits, dashes or spaces
	if (/[^0-9-\s]+/.test(value)) return "Invalid Input!";
	
	// The Luhn Algorithm.
	var sum = 0, product = 0, evenPosition = false;
	
	// Remove whitespace or dash
	value = value.replace(/\D/g, "");
	
	for (var n = value.length - 1; n >= 0; n--) {
		var digit = value.charAt(n),
			  product = parseInt(digit, 10);
		if (evenPosition) {
			
			// Equal to adding both numbers because decimal position is always 1 for product > 10
			if ((product *= 2) > 9) product -= 9;
		}
		sum += product;
		evenPosition = !evenPosition;
	}
	if ((sum % 10) == 0) {
		return "Ok!"
	} else {
		return "Wrong!"
	}
}

