# REW Calculator Widget

A calculator widget for REW to ETH, BTC, BCH, LTC that can easily be added to any website.

## Install

Just include the `rew-calculator.css` and `rew-calculator.js` files, and you're ready to add a REW calculator to your webpage.

```html
    <head>
        <link href="path/to/rew-calculator.css"></link>
    </head>
    <body>
        <script src="path/to/rew-calculator.js"></script>
    </body>
```

## Initialize

When the document loads, create a new instance of RewCalculator, passing in a selector of the element where it should be added.

```js
document.body.onload = () => {
    const rew = new RewCalculator('.calculator')
}
```