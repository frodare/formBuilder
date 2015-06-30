/**
 * dateTimeSeparate, a combination of a date field and a time field
 */


/*global util:true, moment:true */
(function($){
	'use strict';

	var types = $.add123.inputField.types;

	/*
	 * Date Type Support (date)
	 *
	 * Has calendar popup (bootstrap-datepicker)
	 *
	 * Attribute Settings:
	 * data-minyear (default [-=15]) - Can be set to 'CURRENT'
	 * data-maxyear (default [+=2]) - Can be set to 'CURRENT'
	 * data-startdate (default 01/01/[minyear]) - trumps minyear if both set. Can be set to 'TODAY'
	 * data-enddate (default 12/31/[maxyear]) - trumps maxyear if both set. Can be set to 'TODAY'
	 * data-enforce-min (default false) - marks dates <startDate as invalid
	 * data-enforce-max (default false) - marks dates >endDate as invalid
	 */
	types.date = {
		attributes: ['minyear', 'maxyear', 'startdate', 'enddate','enforceMax','enforceMin'],

		_dateFormat: 'MM/DD/YYYY',

		setUp: function(ui) {
			var self = this,
				e = ui.element,
				tmp, startDate, endDate;

			ui.placeholder(self._dateFormat);

			self.enforceMin = e.data('enforceMin');
			self.enforceMax = e.data('enforceMax');

			// Determine year ends
			var minYear = new Date().getFullYear() - 15,
				maxYear = new Date().getFullYear() + 2;

			tmp = e.data('minyear');
			if(tmp !== undefined) {
				if(tmp === 'CURRENT') {
					minYear = new Date().getFullYear();
				} else {
					minYear = tmp;
				}
			}

			tmp = e.data('maxyear');
			if(tmp !== undefined) {
				if(tmp === 'CURRENT') {
					maxYear = new Date().getFullYear();
				} else {
					maxYear = tmp;
				}
			}

			self.startDate = '01/1/' + minYear;
			self.endDate = '12/31/' + maxYear;

			// Determine date ends and save for validation

			tmp = e.data('startdate');
			if(tmp !== undefined) {
				if(tmp === 'TODAY') {
					self.startDate = moment().format(self._dateFormat);
				} else if(tmp.match(/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/)) {
					self.startDate = tmp;
				}
			}
			
			tmp = e.data('enddate');
			if(tmp !== undefined) {
				if(tmp === 'TODAY') {
					self.endDate = moment().format(self._dateFormat);
				} else if(tmp.match(/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/)) {
					self.endDate = tmp;
				}				
			}

			// Setup datepicker
			var datePickerOptions = {
				startDate: self.startDate, 
				endDate: self.endDate,
				autoclose: true,
				forceParse: false,
				format: 'mm/dd/yyyy',
				todayBtn: true,
				todayHighlight: true,
				language: util.lang.code
			};

			e.datepicker(datePickerOptions);

			// Setup inputFilter
			e.inputFilter({
				pattern: /[0-9\/]/,
				max : 10,
				toUpper: true
			});

		},

		converter: {
			/*
			 * Store date in XSD standard: yyyy-mm-dd <=> mm/dd/yyyy
			 */
			toField: function(val, ui) {
				if(!val || !val.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
					return '';
				}
				return val.substring(5, 7) + '/' + val.substring(8, 10) + '/' + val.substring(0, 4);
			},
			fromField: function(val, ui) {
				if(!val || !val.match(/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/)) {
					return '';
				}
				return val.substring(6, 10) + '-' + val.substring(0, 2) + '-' + val.substring(3, 5);
			}
		},

		tearDown: function(ui) {
			ui.element.datepicker('remove');
		},

		validate: function(ui) {
			var self = this,
				date = moment(ui.element.val(),self._dateFormat,true);


			if(!date.isValid() || 
				(self.enforceMin && date.isBefore(moment(self.startDate, self._dateFormat))) ||
				(self.enforceMax && moment(self.endDate, self._dateFormat).isBefore(date))) {
				return {
					message: 'invalid'
				};
			}
		}
	};

	/**
	 * Time type. 
	 *
	 * Has a dropdown with shortcuts.
	 *
	 * Attribute Settings:
	 * data-step (default=30) - Minute increment between times in dropdown
	 * data-military - Converts time into 24-hour 
	 * 
	 */
	types.time = {
		attributes: ['step', 'military'],

		_regex: /^((0[0-9])|([0-9])|(1[0-2])):([0-5][0-9])((am)|(pm))$/,
		_regex2400: /^(([01]?[0-9])|(2[0-3])):[0-5][0-9]$/,

		setUp: function(ifw) {
			var self = this,
				e = ifw.element;

			self.military = !!e.data('military');
			self.step = e.data('step');

			if(!self.military)
			{
				ifw.placeholder('H:MMam/pm');

				e.inputFilter({
					pattern: /[0-9:apm]/,
					max: 7
				});
			}
			else
			{
				ifw.placeholder('HH:MM');

				e.inputFilter({
					pattern: /[0-9:]/,
					max: 5
				});
			}
			

			e.timepicker({
				appendTo: e.parent(),
				selectOnBlur: false,
				step: self.step, //default is 30 and will be set if undefined
				timeFormat: self.military?'H:i':'g:ia'
			});

			// Make sure the timepicker width matches the field width
			e.on('showTimepicker', function(){
				e.siblings('.ui-timepicker-wrapper').width(e.outerWidth());
			});

		},

		getLocalMoment: function(val) {
			var self = this;

			if(self.military)
			{
				if(!val || !val.match(self._regex2400)) {
					return '';
				}
				
				return moment(val,'h:mm');
			}

			if(!val || !val.match(self._regex)) {
				return '';
			}
			
			return moment(val,'h:mma');

		},

		converter: {
			/**
			 * convert from moment format HH:mm (utc) to h:mma (local)
			 */
			toField: function(val, ifw) {
				var self = this,
					localTime;

				if(!val || !val.match(/^[0-9]{2}:[0-9]{2}$/)){
					return '';
				}

				// Convert given UTC to local
				localTime = moment.utc(val, 'HH:mm', true).local();

				if(!localTime.isValid()) {
					return '';
				}

				if(self.military) {
					return localTime.format('H:mm');
				}
				
				return localTime.format('h:mma');
			},

			/**
			 * convert from moment format h:mma (local) to HH:mm (utc)
			 */
			fromField: function(val, ifw) {
				var self = this,
					localMoment = self.getLocalMoment(val);
				
				if(localMoment === '') {
					return localMoment;
				} else {
					return localMoment.utc().format('HH:mm'); //return in utc
				}

			}
		},

		tearDown: function(ifw) {
			ifw.element.timepicker('remove');
		},

		validate: function(ifw) {
			var self = this,
				e = ifw.element,
				val = e.val(),
				invalidMessage = {message: 'invalid'},
				valid;

			valid = self.military? val.match(self._regex2400) : val.match(self._regex);

			if(!valid) {
				return invalidMessage;
			}

		}
	};

	/**
	 * A combination of two InputFields, date & time.
	 *
	 * The original inputfield is hidden between them.
	 *
	 * Format: 'YYYY-MM-DDTHH:mm:ssZ' in UTC
	 *
	 * Attribute Settings:
	 * data-time-width-ratio (default=0.5, min=.2, max=.8) 
	 *
	 * CSS Settings:
	 * min-width (default=270px, min=100px)
	 *
	 * Attributes specific for date or time will be passed to them.
	 */
	types.dateTime = {
		setUp: function(inputFieldWidgetInstance) {
			var self = this;

			self.ifw = inputFieldWidgetInstance;

			self._setUpFields();
			self._refreshFieldWidth();
			self._setUpCleanDirtyEvents();

			self.ifw.element.on('resize', function(ev){
				self._refreshFieldWidth();
			});
		},

		_setUpFields: function() {
			var self = this,
				e = self.ifw.element,
				fieldItems = self.ifw.element.parent().parent(),
				dateAttr = '',
				timeAttr = '',
				options, tmp, i;

			self.ifw.element.parent().hide();

			// Get date attributes
			for(i = 0; i < types.date.attributes.length; ++i) {
				tmp = e.data(types.date.attributes[i]);
				if(tmp !== undefined) {
					dateAttr += 'data-'+types.date.attributes[i]+'="'+tmp+'" ';
				}
			}
			
			// Get time attributes
			for(i = 0; i < types.time.attributes.length; ++i) {
				tmp = e.data(types.time.attributes[i]);
				if(tmp !== undefined) {
					timeAttr += 'data-'+types.time.attributes[i]+'="'+tmp+'" ';
				}
			}

			options = {
				require: true
			};

			// Create the widgets
			self.dateWidget = $('<input type="text" data-type="date" '+dateAttr+'/>')
				.prependTo(fieldItems)
				.inputField(options);
			self.timeWidget = $('<input type="text" data-type="time" '+timeAttr+'/>')
				.appendTo(fieldItems)
				.inputField(options);			
		},

		/**
		 * Make sure the child widgets' total width is equal to the base element's width
		 */
		_refreshFieldWidth: function() {
			var self = this,
				fullWidth = self.ifw.element.outerWidth(),
				elDate = self.dateWidget,
				elTime = self.timeWidget,
				timeWidthRatio,
				minWidth;
					
				// Take out widghet margins/padding from outer width
				fullWidth -= elDate.outerWidth() - elDate.width();
				fullWidth -= elTime.outerWidth() - elTime.width();
				
				// Prevent it from being too small
				minWidth = self.ifw.element.css('min-width');
				if(minWidth !== null) {
					minWidth = parseInt(minWidth, 10);
				}
				if(minWidth === null || minWidth < 100) {
					minWidth = 270; //default
				}

				if(fullWidth < minWidth) {
					fullWidth = minWidth;
				}

				// Set time width at ratio and give the rest to date
				timeWidthRatio = self.ifw.element.data('timeWidthRatio');
				if(isNaN(timeWidthRatio) || timeWidthRatio < 0.2 || 0.8 < timeWidthRatio) {
					timeWidthRatio = 0.5; //default
				}
				elTime.width(fullWidth * timeWidthRatio);
				elDate.width(fullWidth - elTime.width());
		},

		_setUpCleanDirtyEvents: function() {
			var self = this;	

			self.dateWidget.on('dirty clean', function (ev) {
				ev.stopPropagation();
				self.ifw.checkDirty();
			});

			self.timeWidget.on('dirty clean', function (ev) {
				ev.stopPropagation();
				self.ifw.checkDirty();
			});
		},

		converter: {
			/**
			 * No need to worry about utc/local. Handled in type time.
			 * All retrived/set times should be in utc
			 *
			 * Seconds are included in the formatting but are ignored and 
			 * always set to 00
			 */
			toField: function(val, ifw) {
				var self = this,
					splitDate = self._splitDateAndTime(val);

				self.timeWidget.inputField('set', splitDate.time);
				self.dateWidget.inputField('set', splitDate.date);

				// Redraw them via async
				setTimeout(function(){
					self.timeWidget.inputField('redraw');
					self.dateWidget.inputField('redraw');
				}, 0);
			}, 

			fromField: function(val, ifw) {
				var self = this,
					dateTimeObject,
					timeType = self.timeWidget.inputField('getType'),
					localDateMoment = moment(self.dateWidget.inputField('get'), 'YYYY-MM-DD'),
					localTimeMoment = timeType.getLocalMoment.call(timeType, self.timeWidget.val()),
					utcMoment;

				if(!localDateMoment.isValid() || localTimeMoment === '') {
					return '';
				}

				utcMoment = self._joinDateAndTimeMoments(localDateMoment, localTimeMoment).utc();

				return utcMoment.format('YYYY-MM-DDTHH:mm:ss[Z]');
			}
		},

		_splitDateAndTime: function (dateTimeString) {
			var dateString, timeString;
			var dateTime = moment.utc(dateTimeString, 'YYYY-MM-DDTHH:mm:ss[Z]');
			
			if(!dateTime.isValid()){
				return {
					date: '',
					time: ''
				};
			}

			return {
				time: dateTime.format('HH:mm'), //must come before date, before the local conversion
				date: dateTime.local().format('YYYY-MM-DD')
			};
			
		},

		_joinDateAndTimeMoments: function(localDateMoment, localTimeMoment) {
			return moment()
				.second(localTimeMoment.second())
				.minute(localTimeMoment.minute())
				.hour(localTimeMoment.hour())

				.date(localDateMoment.date())
				.month(localDateMoment.month())
				.year(localDateMoment.year());
		},

		validate: function(ifw) {
			var self = this,
				valid = true,
				skipRequired = !self.ifw.hasStatus('require');

			// Do not skip require check when only one is empty
			if(skipRequired){
				skipRequired = !self.dateWidget.inputField('isEmpty');
				skipRequired = skipRequired && !self.timeWidget.inputField('isEmpty');
			}

			valid = valid && self.dateWidget.inputField('validate', skipRequired);
			valid = valid && self.timeWidget.inputField('validate', skipRequired);

			if(!valid) {
				return {
					message: 'invalid'
				};
			}
		},

		// will not validate if empty
		isEmpty: function() {
			var self = this;

			return ($.trim(self.dateWidget.val()) + $.trim(self.timeWidget.val())) === '';
		},

		tearDown: function(ifw) {
			var self = this;

			self.dateWidget.inputField('getField').remove();
			self.timeWidget.inputField('getField').remove();

			self.dateWidget = undefined;
			self.timeWidget = undefined;

			ifw.element.parent().show();
		}

	};

})(jQuery);