def home_pos_old(self):
        
        # move towards switches, until touch
        while gpio.input(self.x_switch_pin) == 0 or gpio.input(self.y_switch_pin) == 0:
            print('hi')
            if gpio.input(self.x_switch_pin) == 0:
                self.mx.single_fstep(1, 0.000005, self.steps_per_fstep)
            if gpio.input(self.y_switch_pin) == 0:
                self.my.single_fstep(1, 0.000005, self.steps_per_fstep)

        # release switches(1/self.fsteps_per_sec)/2
        while gpio.input(self.x_switch_pin) == 1 or gpio.input(self.y_switch_pin) == 1:
            if gpio.input(self.x_switch_pin) == 1:
                self.mx.single_fstep(0, 0.000005, self.steps_per_fstep)
            if gpio.input(self.y_switch_pin) == 1:
                self.my.single_fstep(0, 0.000005, self.steps_per_fstep)

        self.current_state.update({'x': 0, 'y': 0})
        
def linear_move_old(self, cmd):
        distance = {'x': cmd['x'] - self.current_state['x'], 'y': cmd['y'] - self.current_state['y']}
        distance.update({'stroke': math.sqrt(math.pow(distance['x'], 2)+math.pow(distance['y'], 2))})
        print('stroke dist', distance['stroke'])
        if distance['stroke'] >=1: 
                stroke_duration = distance['stroke']/self.fsteps_per_sec
                direction = {}

                if distance['x'] >= 0:
                    direction['x'] = 0
                else:
                    direction['x'] = 1

                if distance['y'] >= 0:
                    direction['y'] = 0
                else:
                    direction['y'] = 1
                    
                distance.update({'x': abs(distance['x']), 'y': abs(distance['y'])})
                print('distance:', distance)

                        

                tx = threading.Thread(target=self.mx.move_fsteps,
                                      args=[direction['x'], distance['x'], distance['x']/stroke_duration,
                                            self.steps_per_fstep])
                ty = threading.Thread(target=self.my.move_fsteps,
                                      args=[direction['y'], distance['y'], distance['y']/stroke_duration,
                                            self.steps_per_fstep])
                tx.start()
                ty.start()
                tx.join()
                ty.join()

                self.current_state['x'] = cmd['x']
                self.current_state['y'] = cmd['y']
        else:
                print('distance 0 or too small')


def move_fsteps(self, direction, fstep_distance, fsteps_per_sec, steps_per_fstep):
        # Set direction
        gpio.output(self.dir_pin, direction)
        print('fullstepspersecond:', fsteps_per_sec)

        # make calculations
        stepcount = int(fstep_distance * steps_per_fstep)
        stepdelay = (1/fsteps_per_sec)/steps_per_fstep/2  # ()...duration of one step; /2...one step consists of two same timed states
        print('stepcount:', stepcount)
        print('stepdelay:', stepdelay)
        totaltime = 0
        init = time.time()
        for i in range(stepcount):
            gpio.output(self.stp_pin, 1)
            time.sleep(stepdelay)
            gpio.output(self.stp_pin, 0)
            time.sleep(stepdelay)
            totaltime+=stepdelay*2
        end = time.time()
        print('total time:', totaltime)
        
        print('true time:', end-init)

    def set_enable_state(self, ena_state):  # enable= 0=enabled/1=disabled
        gpio.output(self.ena_pin, ena_state)
        
        
def single_fstep(self, direction, stepdelay, stepcount=1):  # direction=1/0
        # Set Direction
        gpio.output(self.dir_pin, direction)
        for i in range(stepcount):
            gpio.output(self.stp_pin, 1)
            time.sleep(stepdelay)
            gpio.output(self.stp_pin, 0)
            time.sleep(stepdelay)
