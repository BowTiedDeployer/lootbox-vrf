import shutil
import os 
dir_path = os.path.dirname(os.path.realpath(__file__))
print(dir_path)
src = dir_path + '/lootbox.png'
destination = dir_path + '/lootbox-pinata-images/' 
ext = '.png'

for i in range(255):
    shutil.copy(src, destination + str(i+1) + ext)