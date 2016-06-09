var gulp = require('gulp'),
	browserify = require('browserify'),
	source = require('vinyl-source-stream');

gulp.task('dist', function(cb) {
	return browserify('./index.js')
	.ignore('jquery')
	.ignore('react')
	.ignore('react-router')
	.bundle()
	.pipe(
		source('html-2-react.js')
	)
	.pipe(
		gulp.dest('./dist')
	);
});
