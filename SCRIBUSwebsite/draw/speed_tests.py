import control_speed_tests as control

# Alle Testgeschwindigkeiten in fps
speeds = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200]

test_drawing = [{'mode': 'lineto', 'x': 1000, 'y': 0},
                {'mode': 'lineto', 'x': 0, 'y': 0},
                {'mode': 'lineto', 'x': 1000, 'y': 0},
                {'mode': 'lineto', 'x': 0, 'y': 0},
                {'mode': 'lineto', 'x': 1000, 'y': 0},
                {'mode': 'lineto', 'x': 0, 'y': 0}]

result_text = ''
# instanciate the robot
scribus = control.Robot()

for speed in speeds:
    print(speed)
    scribus.fsteps_per_sec = speed
    
    # draw the cmd_list
    avg_lost_x_steps, avg_lost_y_steps = scribus.draw_cmd_list(test_drawing)
    print(avg_lost_x_steps, avg_lost_y_steps)
    avg_lost_fsteps = avg_lost_x_steps / scribus.steps_per_fstep
    speed_text = 'Geschwindigkeit: '+str(speed)+'; Durchscnittlicher Schrittverlust pro 1000 fullsteps:'+str(avg_lost_fsteps)+'fullsteps./n'
    result_text += speed_text
    
f = open('speed_test_output.txt', 'x')
f.write(result_text)
f.close()