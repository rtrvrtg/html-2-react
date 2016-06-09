var gulp = require('gulp'),
	browserify = require('browserify'),
	source = require('vinyl-source-stream');

gulp.task('dist', function(cb) {
	var browserifyBundle = function() {
		var b = browserify('./index.js', {
			standalone: 'html-2-react',
			debug: true
		});
		b.transform('exposify', {
			expose: {
				"jquery": "jQuery",
				"react": "React",
				"react-router": "ReactRouter"
			}
		})
		return b.bundle();
	};

	return browserifyBundle()
	.pipe(
		source('html-2-react.js')
	)
	.pipe(
		gulp.dest('./dist')
	);
});
