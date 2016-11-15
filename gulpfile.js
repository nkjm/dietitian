var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var concat = require('gulp-concat');

gulp.task('default', function(){

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
