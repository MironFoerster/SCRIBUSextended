def fromStrokeLinesList(strokelines):
    #strokelines_list == [
    #    <line of hw-strokes>, <-- type == np.ndarray(n_points,3)
    #    <line of hw-strokes>,
    #    [<point>, <point>, <point>, ...],
    #    [[x_offset, y_offset, eos_marker], [x_offset, y_offset, eos_marker], ...],
    #    ...
    #]
    
    
    for i in range(len(strokelines)):
        #transform from relative to absolute coordinates
        r = strokelines[i]
        strokeline = r.copy()
        strokeline[:,:-1] = np.cumsum(r[:,:-1], axis=0) # cumulatively sums the x-y-values together to produce absolute instead of relative coordinates
        strokeline[:,1] += i*30
        
        partpath = []
        for j in range(len(strokeline)):
            partpath.append([strokeline[j][0], [strokeline[j][1]])
            if strokeline[-1] == 1:
                path.append(partpath)
                partpath = []
    
    shape_json = str({"path": path})
    
    return shape_json