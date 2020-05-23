# Pogon.html
Global look and feel HTML-based templating for Nodejs (expressjs)

> pogonophile: an admirer of beards; a student of beards.

Pogon is an HTML-based templating system that's based on [Handlebars](https://handlebarsjs.com/). It merges html in a view
with HTML in a master template resulting in a page with a global look and feel. It is intended for web applications that
primarily use server-side rendering.

## For Example:

1: Specify the general look and feel in `views/template.html`:
```html
<!DOCTYPE html>
<html>

	<head>
        <title>My Awesome Web App</title>
        <link rel="stylesheet" href="/stylesheets/style.css">
	</head>

	<body>        
        <header><!-- Put in the links, images, ect, that will go into your app's header and navbar --></header>
    
        <pogon_outlet><!-- This is replaced with the custom HTML for the page --></pogon_outlet>
	</body>

    <footer><!-- More links, copyright, ect --></footer>
</html>
```

2: Define the view for your route in `views/myroute.pogon.html`:
```html
<!DOCTYPE html>
<html>

	<head>
        <script src="/javascripts/myroute.js"></script>
	</head>

	<body>
        <h1>My Route</h1>
        This is the page that's shown for myroute.html<br />
        Some param: <em>{{param}}</em>
	</body>

</html>
```

3: Result: ({param: 'replaced by handlebars'})
```html
<!DOCTYPE html>
<html>

	<head>
        <title>My Awesome Web App</title>
        <link rel="stylesheet" href="/stylesheets/style.css">
        <script src="/javascripts/myroute.js"></script>
	</head>

	<body>        
        <header><!-- Put in the links, images, ect, that will go into your app's header and navbar --></header>

        <h1>My Route</h1>
        This is the page that's shown for myroute.html<br />
        Some param: <em>replaced by handlebars</em>
	</body>

    <footer><!-- More links, copyright, ect --></footer>
</html>
```


## Highlights

* Fully-compatible [Express template engine](https://expressjs.com/en/guide/using-template-engines.html)
* Familiar syntax: 100% HTML and [Handlebars](https://handlebarsjs.com/)
* Programmer-defined components
* Test mode for easy testing of views

## Installation / Usage

NPM Coming soon!

### ExpressJS template Engine

```javascript
app.set('views', './views') // specify the views directory
app.set('view engine', 'pogon.html') // register the template engine
```
(Expressjs implicitly calls `require('pogon.html')`)

Simply name your files with .pogon.html, and include a template.html file in your views directory:

views
* view1.pogon.html
* view2.pogon.html
* template.html

### Standalone
```javascript
const pogon = require('pogon.html');
const mergedHtml = await pogon.render('/path/to/file.pogon.html', {my: 1, options: 2});
```

## Advanced Features

### Default and overridden titles

Template.html can provide a `<title>` tag in its `<head>` section. Views can override this title
by providing their own `<title>` tags in their `<head>` sections. Pogon will automatically choose
the `<title>` tag from the view file when specified, or from the template when its missing.

### Override template.html on a file-by-file basis

```html
<!DOCTYPE html>
<html pogon-template="overridden_template.html">
```

Now the html file uses overridden_template.html. Useful for configuration pages or situations where
a single global template is not enough.

### Override the default template

```javascript
const pogon = require('pogon.html');
pogon.defaultTemplate = "myawesometemplate.html";
```

Useful if you'd like users / customers to provide their own replacement for template.html, or if you
just don't like the name "template.html."

### Test Mode

Stop struggling to parse your views' HTML just to extract the values sent to the templates. Instead,
test mode switches pogon to return descriptive HTML to your tests.

```javascript
const pogon = require('pogon.html')

describe('My test', () => {
    beforeEach(async () => {
        pogon.testMode = true;
    );

    afterEach(async () => {
        pogon.testMode = true;
    );

    it('Test case', async () => {
            const response = await server
                .get(`/myview`)
                .expect(200);

            const result = JSON.parse(response.text);
            const options = result.options;

            assert.equal(options.my, 1);
            assert.equal(options.options, 2);

            assert.equal(result.fileName, 'file.pogon.html');
            assert.isTrue(result.html.includes('Part of my html'));
    });
});
```

### Auto-check input for radio buttons

```html
<!DOCTYPE html>
<html>
    <body>
        <form>
            <input type="radio" name="for-test" value="one" pogon-checked="{{for-test}}">
            <input type="radio" name="for-test" value="two" pogon-checked="{{for-test}}">
            <input type="radio" name="for-test" value="three" pogon-checked="{{for-test}}">
            <input type="radio" name="for-test" value="four" pogon-checked="{{for-test}}">
        </form>
    </body>
</html>
```

The appropriate input tag has `checked` set based on `for-test`'s value. For example, if
`res.render('myview', {for-test: 'three'})` or `await pogon.render('file.pogon.html, {for-test: 'three'})`
is called, the radio button for three will be checked.

### Pogon-based components

Pogon will automatically fill components specified in other files. This can avoid excessive copy and paste.

usescomponent.pogon.html:
```html
<!DOCTYPE html>
<html>

	<head>
	</head>

	<body>
        Before the component
        <pogon_component name="fortest.component.html"></pogon_component>
        After the component
	</body>

</html>
```

fortest.component.html
```html
<!DOCTYPE html>
<html>

	<head>
	</head>

	<body>
		In the component: <span id="inComponent">{{in_component}}</span>
	</body>

</html>
```

template.html: ({in_component: 66})
```html
<!DOCTYPE html>
<html>

	<head>
        <title>My Awesome Web App</title>
        <link rel="stylesheet" href="/stylesheets/style.css">
	</head>

	<body>        
        <pogon_outlet> </pogon_outlet>
	</body>
</html>
```

result:
```html
<!DOCTYPE html>
<html>

	<head>
        <title>My Awesome Web App</title>
        <link rel="stylesheet" href="/stylesheets/style.css">
	</head>

	<body>        
        Before the component
		In the component: <span id="inComponent">66</span>
        After the component
	</body>
</html>
```

### Components declared in source code

Pogon allows creating custom tags that are evaluated and replaced server-side.

```javascript
const pogon = require('pogon.html');
pogon.registerCustomTag('myapp_mytag', async (options, attributes, html) => {

    return { 
        componentFileName: 'myfile.customtag.html', // The file that pogon uses for the custom tag
        newOptions: { // New handlebars options to pass to the custom tag
        }};
});
```

See the "custom tags" test for a complete example

## More examples
For more examples, see the unit tests.