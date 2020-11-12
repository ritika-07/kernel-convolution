#!/bin/bash

#SBATCH --job-name=timingKernelConvolution
#SBATCH --partition=cpu
#SBATCH --cpus-per-task=28
#SBATCH --mem-per-cpu=8G
#SBATCH --nodes=1
#SBATCH --output=kernelConvOutput.out
#SBATCH --time=120:00
#SBATCH --mail-type=ALL
#SBATCH --mail-user=jwheeler@scu.edu


#module load SciPy-bundle/2019.03-foss-2019a
#pip3 install --user Pillow

export JSLOG=1
export INWAVE=1
export OMP_PLACES=cores
export OMP_PROC_BIND=spread

echo "["
WD=/WAVE/users/unix/jwheeler/projectsHome/Parallel-Kernel-Convolutions-master
source ${WD}/timingExperiment/venv/bin/activate

for ThreadNum in 1 2 4 8 16 28
  do
  echo "{'ThreadNum': ${ThreadNum}, 'ImageTimes':["
  for ImageNum in {0..10}
  do
    echo "{'imageNum': ${ImageNum},"
    export OMP_NUM_THREADS=$ThreadNum
    echo "'OpenMP':["
    for AttemptOpenMP in {0..5}
    do
      ${WD}/OpenMP/openMP ${WD}/timingExperiment/images/test_${ImageNum}.bmp -nosave ${ThreadNum} 3
      echo ","
    done
    echo "],'Python':["
    for AttemptPython in {0..5}
    do
      python3 ${WD}/python/kernelConvolution.py ${WD}/timingExperiment/images/test_${ImageNum}.bmp -nosave ${ThreadNum} 3
      echo ","
    done
    echo "]},"
  done
  echo "]},"
done
echo "]"
