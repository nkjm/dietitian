'use strict';

var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var zip = require('gulp-zip');
var replace = require('gulp-replace');
var debug = require('debug')('compile');

gulp.task('default', function(){
    // Replace process.env.VARIABLE_NAME to actual value.
    // This replacement is necessary since ACCS does not accept special charactors like +^ for environment variables.
    debug('Compiling environment_variables.js...');
    var stream = gulp.src(['environment_variables.js']);
    for (var environment_variable_key of Object.keys(process.env)){
        debug('Replacing process.env.' + environment_variable_key + ' to ' + process.env[environment_variable_key] + '...');
        stream = stream.pipe(replace('process.env.' + environment_variable_key, "'" + process.env[environment_variable_key] + "'"));
    }
    stream.pipe(gulp.dest('./'));
    debug('Done.');

    // Compress all files into artifact.zip. This zip file will be used to deploy application.
    debug('Creating artifact.zip...');
    return gulp.src('./**')
        .pipe(zip('artifact.zip'))
        .pipe(gulp.dest('./'));
});

gulp.task('compress', function(){
	var src = [
		'public/javascripts/dietitian/*.js',
		'!public/javascripts/dietitian/*.min.js'
	];
	gulp.src(src, { base: 'public/javascripts'})
		.pipe(uglify({
			mangle: false,
			preserveComments: 'license'
		}))
		.pipe(rename({
			extname: '.min.js'
		}))
		.pipe(gulp.dest('public/javascripts'));
});

gulp.task('concat', function(){
	// マイページ
	var srcHost = [
        'public/bower_componetns/jquery/dist/jquery.min.js',
		'public/bower_components/angular/angular.min.js',
		'public/bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js',
		'public/bower_components/chart.js/dist/Chart.min.js',
		'public/javascripts/dietitian/module.min.js',
		'public/javascripts/dietitian/rootCtl.min.js',
		'public/javascripts/dietitian/personCtl.min.js',
		'public/javascripts/dietitian/todayCalorieCtl.min.js',
		'public/javascripts/dietitian/todayNutritionCtl.min.js',
		'public/javascripts/dietitian/todayHistoryCtl.min.js'
	];
	gulp.src(srcHost)
		.pipe(concat('dietitian.min.js'))
		.pipe(gulp.dest('public/javascripts/dist'));
});
