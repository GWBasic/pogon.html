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
        const result = await runPogon(
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
        const result = await runPogon(
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
            const result = await runPogon(
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

        const expectedHtml = await runPogon('handlebars.pogon.html', expectedOptions);

        pogon.testMode = true;

        try {
            const result = await runPogon('handlebars.pogon.html', expectedOptions);

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

        const result = await runPogon('pogon-checked.pogon.html', {"for-test": 'three'});

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

    it('pogon-template', async () => {
        const result = await runPogon('overrides_template.pogon.html');

        const $ = cheerio.load(result);

        const titleElement = $('title')
        assert.equal(titleElement.text(), 'Overridden template');

        const contentElement = $('#content')
        assert.equal(contentElement.text(), 'This page overrode the template');
    });
});

async function runPogon(templateName, options) {
    var result = null;
    const callback = (err, r) => {
        if (err) {
            throw err;
        }
        result = r;
    };

    const hasTitlePath = path.join(testFolder, templateName);

    await pogon.renderFile(hasTitlePath, options, callback);

    assert.isNotNull(result, 'Callback not called');
    return result;
}

async function checkMerge(templateName, expectedTitle) {
    var result = await runPogon(templateName, {});

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
