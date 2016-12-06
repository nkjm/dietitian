var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var zip = require('gulp-zip');
var replace = require('gulp-replace');
const LINE_CHANNEL_ACCESS_TOKEN = 'JkIbAn3nLwihG9jyNqzxCEqjntHo7kMzkGpGac4JzSIVq47xM3uss3lxOZxgFJlZscEvfuQjVEHgWEpkmMyrcba/yRjBGavmI6ASkLqnTKCJHQuD8lNm9GK+AXT5yInMv3qf2kRfjF9TUX4n92WHpwdB04t89/1O/w1cDnyilFU=';
const LINE_CHANNEL_ID = '1485503788';
const LINE_CHANNEL_SECRET = '8414e25bcb6bed8d928a77f0d23b116f';

gulp.task('default', function(){

});

gulp.task('oracle', function(){
    gulp.src(['lineBot.js'])
        .pipe(replace('process.env.LINE_CHANNEL_ID', "'" + LINE_CHANNEL_ID + "'"))
        .pipe(replace('process.env.LINE_CHANNEL_SECRET', "'" + LINE_CHANNEL_SECRET + "'"))
        .pipe(replace('process.env.LINE_CHANNEL_ACCESS_TOKEN', "'" + LINE_CHANNEL_ACCESS_TOKEN + "'"))
        .pipe(gulp.dest('./oracle'));
    return gulp.src('./**')
        .pipe(zip('dietitian.zip'))
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
