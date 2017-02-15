# OpenUI5-SAPUI5-CRUDModel

[OpenUI5](http://openui5.org/)/[SAPUI5](https://sapui5.hana.ondemand.com) Model implementation for [mevdschee/php-crud-api](https://github.com/mevdschee/php-crud-api)

## Setup in UI5
1. Add the CRUDModel.js file to you project folder library/bd/model/
2. In your Component.js file add the following lines
```javascript
jQuery.sap.registerModulePath("nl.barrydam", "library/bd/");
jQuery.sap.require("nl.barrydam.model.CRUDModel");
```

## Contructor
**new nl.barrydam.model.CRUDModel(sServiceUrl, mParameters?)**

Constructor for a new CRUDModel.

**Parameters:**

*{string}*	| **sServiceUrl** 	| base uri of the service to request data from; additional URL parameters appended here will be appended to every request can be passed with the mParameters object as well
*{string}*	| **sServiceUrl** 	| base uri of the service to request data from; additional URL parameters appended here will be appended to every request can be passed with the mParameters object as well


## BUY ME A BEER
[![PayPayl donate button](https://img.shields.io/badge/paypal-donate-yellow.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=XX68BNMVCD7YS "Donate once-off to this project using Paypal")