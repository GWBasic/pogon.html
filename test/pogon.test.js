"use strict";

const assert        = require('chai').assert;
const cheerio		= require('cheerio');
const path			= require('path');

const pogon = require('../pogon.html')

const testFolder = path.join(path.dirname(__dirname), 'testdata');

describe('Pogon tests', () => {
    it('hastitle.pogon', async () => {
        await checkMerge('hastitle.pogon.html', 'Title in page');
    });

    it('notitle.pogon', async () => {
        await checkMerge('notitle.pogon.html', 'Title from template');
    });

    it('handlebars and mustaches', async () => {
        const result = await render(
            'handlebars.pogon.html', {
                a: 1,
                b: 2,
                c: 3,
                global_a: 11,
                global_b: 22,
                global_c: 33});

        const $ = cheerio.load(result);

        var inserted = $('#template');
        assert.equal(inserted.text(), '1 2 3', 'Template not inserted');

        inserted = $('#global');
        assert.equal(inserted.text(), '11 22 33', 'Template not inserted');
    });

    it('pogon_components', async () => {
        const result = await render(
            'usescomponent.pogon.html', {
                in_component: 888,
                global_a: 11,
                global_b: 22,
                global_c: 33});

        const $ = cheerio.load(result);

        var inserted = $('#inComponent');
        assert.equal(inserted.text(), '888', 'Template not inserted');

        inserted = $('#global');
        assert.equal(inserted.text(), '11 22 33', 'Template not inserted');

        assert.isTrue(result.includes('Before the component'), '"Before the component" missing');
        assert.isTrue(result.includes('After the component'), '"After the component" missing');
        assert.isTrue(result.includes('In the component: '), '"In the component: " missing');

        assert.isFalse(result.includes('<pogon_component'), '"<pogon_component" is in the result');
    });

    it('custom tags', async () => {
        pogon.registerCustomTag('custom_tag', customTagHandler);

        try {
            const result = await render(
                'usescustomtag.pogon.html', {
                    toassert: 99});

            assert.isTrue(result.includes('Before the component'), '"Before the component" missing');
            assert.isTrue(result.includes('After the component'), '"After the component" missing');
            assert.isTrue(result.includes('Custom component: goes in the outlet'), '"Custom component: 99" missing');
        } finally {
            pogon.unregisterCustomTag('custom_tag');
        }
    });

    it('test mode', async () => {
        const expectedOptions = {
            a: 1,
            b: 2,
            c: 3,
            global_a: 11,
            global_b: 22,
            global_c: 33};

        const expectedHtml = await render('handlebars.pogon.html', expectedOptions);

        pogon.testMode = true;

        try {
            const result = await render('handlebars.pogon.html', expectedOptions);

            const rendered = JSON.parse(result);

            assert.equal(rendered.html, expectedHtml, "HTML incorrect in test mode");

            const expectedRendered = {
                html: expectedHtml,
                options: expectedOptions,
                filePath: path.join(testFolder, 'handlebars.pogon.html'),
                templatePath: path.join(testFolder, 'template.html'),
                dirName: testFolder,
                fileName: 'handlebars.pogon.html'
            };

            assert.deepEqual(rendered, expectedRendered);

        } finally {
            pogon.testMode = false;
        }
    });

    it('pogon-checked', async () => {

        const result = await render('pogon-checked.pogon.html', {"for-test": 'three'});

        const $ = cheerio.load(result);
        const inputTags = $('input');
        
        assert.equal(inputTags.length, 4, 'incorrect number of input tags');

		for (var inputTagIndex = 0; inputTagIndex < inputTags.length; inputTagIndex++) {
			const inputTag = inputTags[inputTagIndex];

            assert.isUndefined(inputTag.attribs['pogon-checked'], 'pogon-checked attribute not removed');

            const value = inputTag.attribs.value;

            if (value == 'three') {
                assert.equal(inputTag.attribs.checked, 'checked', 'Checked not set');
            } else {
                assert.isUndefined(inputTag.attribs.checked, `Checked incorrectly defined for ${value}`);
            }
		}
    });

    it('pogon-selected', async () => {

        const result = await render('pogon-selected.pogon.html', {"for-test": 'three'});

        const $ = cheerio.load(result);
        const optionTags = $('option');
        
        assert.equal(optionTags.length, 4, 'incorrect number of option tags');

		for (var optionTagIndex = 0; optionTagIndex < optionTags.length; optionTagIndex++) {
			const optionTag = optionTags[optionTagIndex];

            assert.isUndefined(optionTag.attribs['pogon-selected'], 'pogon-selected attribute not removed');

            const value = optionTag.attribs.value;

            if (value == 'three') {
                assert.equal(optionTag.attribs.selected, 'selected', 'Selected not set');
            } else {
                assert.isUndefined(optionTag.attribs.selected, `Selected incorrectly defined for ${value}`);
            }
		}
    });

    it('pogon-template', async () => {
        const result = await render('overrides_template.pogon.html');

        const $ = cheerio.load(result);

        const titleElement = $('title')
        assert.equal(titleElement.text(), 'Overridden template');

        const contentElement = $('#content')
        assert.equal(contentElement.text(), 'This page overrode the template');
    });

    it('override default template', async () => {
        var result = await render('hastitle.pogon.html');

        assert.isFalse(result.includes('The default template is overridden'), 'Template overridden');

        pogon.defaultTemplate = 'template_override.html';
        var result = await render('hastitle.pogon.html');

        assert.isTrue(result.includes('The default template is overridden'), 'Template not overridden');
    });

    it('Express template engine, success', async () => {
        var called = false;
        const callback = (err, result) => {
            if (err) {
                throw err;
            }

            called = true;

            const $ = cheerio.load(result);
            const titleTag = $('head title');
        
            assert.equal(titleTag.text(), 'Title in page', 'Wrong title');
        };
    
        const filePath = path.join(testFolder, 'hastitle.pogon.html');
    
        await pogon.renderFile(filePath, {}, callback);
    
        assert.isTrue(called, 'Callback not called');
    });

    it('Express template engine, error', async () => {
        var err = null;
        const callback = (e, result) => {
            err = e;
        };
    
        const filePath = path.join(testFolder, 'dne.pogon.html');
    
        await pogon.renderFile(filePath, {}, callback);
    
        assert.isNotNull(err);
        assert.equal(err.message, `ENOENT: no such file or directory, open '${filePath}'`);
    });
});

async function render(filename, options) {
    const filePath = path.join(testFolder, filename);
    return await pogon.render(filePath, options);
}

async function checkMerge(templateName, expectedTitle) {
    var result = await render(templateName, {});

    const $ = cheerio.load(result);
    const titleTag = $('head title');

    assert.equal(titleTag.text(), expectedTitle, 'Wrong title');

    const inserted = $('#template');
    assert.equal(inserted.text(), 'from template', 'Template not inserted')

    assert.isFalse(result.includes('<pogon_outlet'), '"<pogon_outlet" is in the result');
};

async function customTagHandler(options, attributes, html) {
    assert.equal(options.toassert, 99, 'toassert not set');
    assert.equal(attributes.a1, "one", 'Attribute a1 not set');
    assert.equal(attributes.a2, "two", 'Attribute a2 not set');
    assert.equal(attributes.a3, "three", 'Attribute a3 not set');
    assert.equal(html, '<p>Tag contents</p>', 'html incorrect');

    return { 
        componentFileName: 'fortest.customtag.html',
        newOptions: 'goes in the outlet' };
};
