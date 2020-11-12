OS := $(shell uname)

ifeq ($(OS),Darwin)
  CC := /usr/local/Cellar/gcc/9.3.0_1/bin/gcc-9
else
  CC := gcc
endif


default: openMP

openMP: kernelConvolution.c cJSON.c
	${CC} -Wall -Wextra -g -O3 -fopenmp -o $@ kernelConvolution.c cJSON.c -lm

openMPHPC: kernelConvolution.c cJSON.c
    ${CC} -std=c99 -Wall -Wextra -g -O3 -fopenmp -o $@ kernelConvolution.c cJSON.c -lm
clean:
	-rm -f openMP
