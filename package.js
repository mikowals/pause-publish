Package.describe({
  name: 'mikowals:pause-publish',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: 'a publish function that can pause and resume',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.2');
  api.use('grigio:babel@0.1.1','server');
  api.addFiles('pause-publish.es6.js','server');
  api.export('pausePublish','server');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('mikowals:pause-publish');
  api.addFiles('pause-publish-tests.js');
});
