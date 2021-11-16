import math


def fromElementsList(elements_list):
	cmd_list = []  # [{'mode': , 'x': , 'y': }, {'mode': , 'x': , 'y': }, ...]
	for element in elements_list:
		for partpath in element['path']:
			stroke_start = True
			point_skipped = False
			for point in partpath:
				# set the mode: move if parpath starts or if previous point was outside of drawing area
				if stroke_start or point_skipped:
					mode = 'moveto'
					stroke_start = False
					point_skipped = False
				else:
					mode = 'lineto'

				trans_point = {'x': point[0]*element['scale'], 'y': point[1]*element['scale']}
				trans_point = {'x': trans_point['x']*math.cos(element['rotation']*math.pi/180) - trans_point['y']*math.sin(element['rotation']*math.pi/180), 'y': trans_point['x']*math.sin(element['rotation']*math.pi/180) + trans_point['y']*math.cos(element['rotation']*math.pi/180)}
				trans_point = {'x': trans_point['x'] + element['origin']['x'], 'y': trans_point['y'] + element['origin']['y']}

				if 1000 >= trans_point['x'] >= 0 and 1000 >= trans_point['y'] >= 0:
					cmd_list.append({'mode': mode, 'x': trans_point['x'], 'y': trans_point['y']})
				else:
					point_skipped = True
	return cmd_list


def fromStringsList(strings_list):  # ['lineto 1,2','lineto 30,54',...]
	cmd_list = []  # [{'mode': , 'x': , 'y': }, {'mode': , 'x': , 'y': }, ...]
	modes_list = ['moveto', 'lineto']
	point_skipped = False

	for line in strings_list:
		if line[:6] in modes_list:

			if point_skipped:
				mode = 'moveto'
			else:
				mode = line[:6]

			point = line[6:].split(',')
			if len(point) == 2:
				try:
					x = int(point[0])
					y = int(point[1])
				except:
					print('point values are not integers')
				else:
					if 1000 >= x >= 0 and 1000 >= y >= 0:
						cmd_list.append({'mode': mode, 'x': x, 'y': y})
						print('valid line, success')
					else:
						point_skipped = True

			else:
				print('too many point values')
		else:
			print('input string not valid, mode is missing')
	return cmd_list

def fromStrokeLinesList(strokelines_list):
    pass
    #strokelines_list == [
    #    <line of hw-strokes>, <-- type == np.ndarray(n_points,3)
    #    <line of hw-strokes>,
    #    [<point>, <point>, <point>, ...],
    #    [[x_offset, y_offset, eos_marker], [x_offset, y_offset, eos_marker], ...],
    #    ...
    #]
    
    #transform from relative to absolute coordinates
    
    for i in range(len(strokelines_list)):
        r = strokelines_list[i]
        strokes = r.copy()
        
        strokes[:,:-1] = np.cumsum(r[:,:-1], axis=0) # cumulatively sums the x-y-values together to produce absolute instead of relative coordinates
        
    
    return cmd_list
