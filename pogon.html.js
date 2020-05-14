/**
 * Pogon module
 * @module pogon.html
 */


const cheerio		= require('cheerio'); // https://github.com/cheeriojs/cheerio
const fs 			= require('fs').promises;
const handlebars	= require('handlebars');
const path			= require('path');

const TEMPLATE_NAME = "template.html";

const customTagHandlers = {};

/**
 * Callback for a custom tag
 * @callback customTagCallback
 * @param {!Object} options - The options that were passed to the template.  (Typically passed to response.render())
 * @param {!Object} attributes - The attributes set for the custom tag
 * @param {!string} html - The raw contents of the custom tag
 * @returns {Promise<string>} - The updated contents to replace the custom tag with
 * @throws All exceptions are caught and will bubble into error handlers registered with Express
 */

 /**
  * Registers a custom tag handler
  * @param {!string} customTagName - The name of the tag. This can be anything, and can even be known HTML tags
  * @param {!customTagCallback} callback - The callback that handles the custom tag
  */
exports.registerCustomTag = (customTagName, callback) => {
	customTagHandlers[customTagName] = callback;
};

/**
 * Unregisters a custom tag handler
 * @param {!string} customTagName - The name of the tag
 */
exports.unregisterCustomTag = customTagName => {
	delete customTagHandlers[customTagName];
};

/**
 * Enables test mode. When enabled, pogon always returns a JSON object
 */
exports.testMode = false;

/**
 * Called from 'renderFile' on success or error
 * @callback renderFileCallback
 * @param {?error} err - Called on error
 * @param {?string} rendered - The completed html
 */

/**
 * Renders the file using the passed options
 * @param {!string} filePath - The file to render. There must be a "template.html" in the same folder or an error will occur
 * @param {!Object} options - The object that's passed to the template. (Typically passed to response.render())
 * @param {!renderFileCallback} callback - Called on success or error
 */
exports.renderFile = async (filePath, options, callback) => {
	try {
		const uncompiledContent = (await fs.readFile(filePath)).toString();

		const processHandlebars = handlebars.compile(uncompiledContent);
		const compiledContent = processHandlebars(options);
	
		const content$ = cheerio.load(compiledContent);

		const dirName = path.dirname(filePath);

		// Determine if the default template is overridden
		var templatePath;
		const htmlTag = content$('html')[0];
		if (htmlTag.attribs['pogon-template']) {
			templatePath = path.join(dirName, htmlTag.attribs['pogon-template']);
		} else {
			templatePath = path.join(dirName, TEMPLATE_NAME);
		}

		var templateContent = (await fs.readFile(templatePath)).toString();
		const compiledTemplateContent = handlebars.compile(templateContent);
		templateContent = compiledTemplateContent(options);

		const $ = cheerio.load(templateContent);
		const templateOutletTag = $('pogon_outlet');

		// First, merge the requested file into the template
		await merge($, templateOutletTag, content$);

		// Now search for and merge in components
		var tagsProcessed;
		do {
			const componentOutletTags = $('pogon_component');

			for (var componentOutletTagIndex = 0; componentOutletTagIndex < componentOutletTags.length; componentOutletTagIndex++) {
				const componentOutletTag = componentOutletTags[componentOutletTagIndex];
				const name = componentOutletTag.attribs.name;
				const componentFilePath = path.join(dirName, name);

				await compileAndMergeFromFile($, $(componentOutletTag), componentFilePath, options);
			}

			for (var customTagName in customTagHandlers) {
				const customOutletTags = $(customTagName);

				for (var customOutletTagIndex = 0; customOutletTagIndex < customOutletTags.length; customOutletTagIndex++) {
					const customOutletTag = customOutletTags[customOutletTagIndex];
					const customOutletTag$ = $(customOutletTag);
					const { componentFileName, newOptions } = await customTagHandlers[customTagName](options, customOutletTag.attribs, customOutletTag$.html());
					const componentFilePath = path.join(dirName, componentFileName);
					
					await compileAndMergeFromFile($, customOutletTag$, componentFilePath, newOptions);
				}
			}

			tagsProcessed = componentOutletTags.length;
		} while (tagsProcessed > 0);

		// Check off default values in forms
		const inputTags = $('input');
		for (var inputTagIndex = 0; inputTagIndex < inputTags.length; inputTagIndex++) {
			const inputTag = inputTags[inputTagIndex];

			if (inputTag.attribs['pogon-checked']) {
				const checkedValue = inputTag.attribs['pogon-checked'];
				delete inputTag.attribs['pogon-checked'];

				if (inputTag.attribs.value == checkedValue) {
					const inputTag$ = $(inputTag);
					inputTag$.attr('checked','checked');
				}
			}
		}

		var rendered = $.root().html();
		if (module.exports.testMode) {
			testResult = {
				html: rendered,
				options: options,
				filePath: filePath,
				templatePath: templatePath,
				dirName: dirName,
				fileName: filePath.substring(dirName.length + 1)
			};

			rendered = JSON.stringify(testResult);
		}

		return callback(null, rendered);

	} catch (exception) {
		console.log(exception);
		return callback(exception)
	}				
};

async function compileAndMergeFromFile($, templateOutletTag, filePath, options) {
	const uncompiledContent = (await fs.readFile(filePath)).toString();

	const processHandlebars = handlebars.compile(uncompiledContent);
	const compiledContent = processHandlebars(options);

	content$ = cheerio.load(compiledContent);

	await merge($, templateOutletTag, content$);
}

async function merge($, templateOutletTag, content$) {
	// First, clean up the title tags so there only is one
	const currentTtitleTag = $('head title');
	const contentTitleTag = content$('head title');
	
	// When both the template and the document have a title, delete the template's title
	if (currentTtitleTag.length > 0 && contentTitleTag.length > 0) {
		currentTtitleTag.remove();
	} // else if only one has a title, keep it. (Either the template or document specify a title)

	// Merge the <head> parts
	const templateHeadTag = $('head');
	const contentHeadTag = content$('head');
	templateHeadTag.append(contentHeadTag.html());

	// replace the template's <pogon_outlet> with the content's body
	const contentBodyTag = content$('body');
	templateOutletTag.after(contentBodyTag.html());
	templateOutletTag.remove();
}

exports.__express = exports.renderFile;

