import json
import os
import sys
import timeit

from shutil import copyfile
from scipy import misc
import numpy as np
from PIL import Image, ImageOps
from scipy import signal as sg

from multiprocessing.pool import ThreadPool as Pool
# from multiprocessing import shared_memory
from functools import partial

# from joblib import Parallel, delayed
from multiprocessing import set_start_method


def convoluteFileNoParallel(inputFile, fileOutputLocation,kernel,numThreads, makeGreyScale, shouldSave):
    input_image = Image.open(inputFile)
    if makeGreyScale:
        input_image=input_image.convert('L')
#         gray = ImageOps.grayscale(input_image)
        input_image = ImageOps.colorize(input_image, (0, 0, 0), (255,255,255))


    # Numpy Code
    input_image = np.asarray(input_image)
    # output_image = np.zeros((input_pixels.shape[0],input_pixels.shape[1],input_pixels.shape[2]))

    # if(makeGreyScale):
    #     for row in range((input_image.shape)[0]):
    #         #rowStart = input_image.width * row
    #         for col in range((input_image.shape)[1]):
    #             pixel = input_image[row][col]
    #             acc = pixel[0]
    #             acc += pixel[1]
    #             acc += pixel[2]
    #             acc = int(acc/3)
    #             input_image[row][col] = np.asarray([acc,acc,acc])
                # pixel[0] = acc
                # pixel[1] = acc
                # pixel[2] = acc

    output_image = []
    start = timeit.default_timer()
    # print(np.asarray(input_image).shape)
    # print(np.asarray(kernel).shape)
    for index in range(3):
        piece = sg.convolve2d(input_image[:,:,index],np.asarray(kernel),boundary='symm', mode='same')
        output_image.append(piece)
    output_image = np.stack(output_image, axis=2).astype("uint8")
    # for row in range(input_image.height):
    #     #rowStart = input_image.width * row
    #     print(row)
    #     for col in range(input_image.width):
    #         #pixStart = rowStart + col
    #         pixel = input_pixels[row][col]

    #         if row - edgeSize < 0 or row + edgeSize > input_image.height-1 or col-edgeSize < 0 or col+edgeSize > input_image.width-1:
    #             # draw.point((row, col), tuple(pixel))
    #             output_image[row][col] = pixel
    #         else:
    #             acc = np.zeros(3)
    #             for rowK in range(len(kernel)):
    #                 for colK in range(len(kernel)):

    #                     kPixel = input_pixels[ row- edgeSize + rowK][col- edgeSize + colK]
    #                     acc = np.sum(np.multiply(kPixel,kernel[rowK][colK]))
    #                     # acc[0] += kPixel[0] * kernel[rowK][colK]
    #                     # acc[1] += kPixel[1] * kernel[rowK][colK]
    #                     # acc[2] += kPixel[2] * kernel[rowK][colK]

    #             # draw.point((col, row), (int(acc[0]), int(acc[1]), int(acc[2])))
    #             output_image[row][col] = acc

    elapsed = timeit.default_timer() - start
    output_image = Image.fromarray(output_image)
    if shouldSave:
        print("saving..")
        output_image.save(fileOutputLocation)

    return elapsed

def split(imageSlices,input_image):
    # sliceHeightSize = ((input_image.shape)[0]) / imageSlices
    # sliceWidthSize = ((input_image.shape)[1]) / imageSlices
    # startX = 0
    # endX = sliceWidthSize
    # startY = 0
    # endY = sliceHeightSize
    # imagePieces = []
    # w = 0
    # print(imageSlices)
    # for i in range (1,imageSlices):
    #     for j in range (0,imageSlices+2):
    #         imagePieces.append(input_image[int(startX):int(endX),int(startY):int(endY),:])
    #         startY = endY
    #         endY += sliceHeightSize
    #         print(len(imagePieces))
    #     startY = 0
    #     endY = sliceHeightSize
    #     startX = endX
    #     endX += sliceWidthSize
    imagePieces = np.array_split(input_image,imageSlices)

    #IF YOU WANT TO SPLIT THE IMG BETTER, DO SO HERE


    # print(len(imagePieces))
    return imagePieces

def join (imageSlices, input_image,height,width):
    # sliceWidthSize = height / imageSlices
    # sliceHeightSize = width / imageSlices
    # startX = 0
    # endX = sliceWidthSize
    # startY = 0
    # endY = sliceHeightSize
    # pos = 0
    # t = np.zeros((height, width))
    # for i in range(1, imageSlices):
    #     for j in range(0, imageSlices + 2):
    #         t[int(startX):int(endX), int(startY):int(endY),:] = input_image[pos]
    #         pos = pos + 1
    #         startY = endY
    #         endY += sliceHeightSize
    #     startY = 0
    #     endY = sliceHeightSize
    #     startX = endX
    #     endX += sliceWidthSize
    # out = [ind[0] for ind in input_image]
    # print(len(input_image))
    out = input_image[0]

    # IF YOU TRIED TO SPLIT THE DATA BETTER, SOW IT HERE
    for x in range(1,len(input_image)):
        out = np.concatenate((np.asarray(out), np.asarray(input_image[x])),axis=1)
    #out = np.stack(out, axis=2).astype("uint8")
    out = out.transpose(1,2,0)



    # print(out)
    return out

def f(img,kernel):
    output_image = []
    # print(img.shape)
    for index in range(3):
        piece = sg.convolve2d(img[:,:,index],np.asarray(kernel),boundary='symm', mode='same')
        output_image.append(piece)
        

    return output_image

def partialConv(row, kernel, input_shm_name, output_shm_name,shape, dType):
    print(row)
    input_image_shm = shared_memory.SharedMemory(name=input_shm_name)
    input_image = np.ndarray(shape, dtype=dType, buffer=input_image_shm.buf)
#     print(input_image[row][0])

#
# def convolute1(inputFile, fileOutputLocation,kernel,numThreads, makeGreyScale, shouldSave):
#     input_image = Image.open(inputFile)
#     if makeGreyScale:
#         input_image = input_image.convert('LA')
#     start_time = timeit.default_timer()
#     input_image = np.asarray(input_image)
#     #output_image = np.asarray(input_image)
#
#     height = input_image.shape[0]
#     width = input_image.shape[1]
#
#     # create shared memory region for input and output image
#     shared_input = shared_memory.SharedMemory(create=True, size=input_image.nbytes)
#     shared_input_id = shared_input.name
#     shared_output = shared_memory.SharedMemory(create=True, size=input_image.nbytes)
#     shared_output_id = shared_output.name
#
#     # copy data in image buffer to shared memory buffer
#     input_np = np.ndarray(input_image.shape, dtype=input_image.dtype, buffer=shared_input.buf)
#     input_np[:] = input_image[:]
#
#     call_convolute = partial(partialConv,kernel=kernel, input_shm_name=shared_input_id, output_shm_name=shared_output_id,shape=input_image.shape,dType=input_image.dtype)
#
#     with Pool(processes=numThreads) as pool:
#         pool.map(call_convolute, range(height))
#
#
#     elapsed = timeit.default_timer() - start_time
#
#     #output_image = join(imageSlices,output_image,height,width)
#     output_np = np.ndarray(input_image.shape, dtype=input_image.dtype, buffer=shared_output.buf)
#     output_image = Image.fromarray(output_np.astype('uint8'))
#
#     shared_input.close()
#     shared_input.unlink()
#     shared_output.close()
#     shared_output.unlink()
#
#     if shouldSave:
#         print("saving..")
#         # output_image.convert('RGB')
#         output_image.save(fileOutputLocation)
#
#
#
#
#     return elapsed
#
#


def convoluteFileParallel(inputFile, fileOutputLocation,kernel,numThreads, makeGreyScale, shouldSave):
	# pool = mp.Pool(processes=numThreads)
    imageSlices = numThreads
    input_image = Image.open(inputFile)

#     if makeGreyScale:
#         input_image = input_image.convert('LA')
    if makeGreyScale:
        input_image=input_image.convert('L')
#         gray = ImageOps.grayscale(input_image)
        input_image = ImageOps.colorize(gray, (0, 0, 0), (255,255,255))
    
    if makeGreyScale:
        input_image=input_image.convert('L')
        input_image = ImageOps.colorize(input_image, (0, 0, 0), (255,255,255))

    input_image = np.asarray(input_image)
    height = input_image.shape[0]
    width = input_image.shape[1]

    print("Width: " + str(input_image[0][0]))

    start_time = timeit.default_timer()

    # if(makeGreyScale):
    #     for row in range((input_image.shape)[0]):
    #         #rowStart = input_image.width * row
    #         for col in range((input_image.shape)[1]):
    #             pixel = input_pixels[row][col]
    #             acc = pixel[0]
    #             acc += pixel[1]
    #             acc += pixel[2]
    #             acc = int(acc/3)
    #             input_pixels[row][col] = np.asarray([acc,acc,acc])
                # pixel[0] = acc
                # pixel[1] = acc
                # pixel[2] = acc

    imagePieces = split(imageSlices,input_image)
    output_image = []

    pool = Pool(processes=numThreads)
    conv_partial = partial(f,kernel=kernel)

    start = timeit.default_timer()
    # slices = Parallel(n_jobs=imageSlices)(delayed(conv_partial)(pieces) for pieces in imagePieces)
    output_image = pool.map(conv_partial,imagePieces)
    pool.close()
    pool.join()
    elapsed = timeit.default_timer() - start
    output_image = join(imageSlices,output_image,height,width)
    output_image = Image.fromarray(output_image.astype('uint8'))

    if shouldSave:
        print("saving..")
        # output_image.convert('RGB')
        output_image.save(fileOutputLocation)

    return elapsed

# def calculateOne(fileIn,row,col):
# 	#find value

def getDummyKernel(size):
    kernel = []
    for r in range(size):
        kernel.append([])
        for c in range(size):
            kernel[r].append(.11)
    return kernel

def main():

    fileInputLocation = None
    fileOutputLocation = None
    shouldSave = False
    numThreads = 1
    kernelSize = 0
    kernel = None
    shouldWriteToTiming = False
    makeGreyScale = False
    # freeze_support()
    # try:
    #     set_start_method('spawn')
    # except RuntimeError:
    #     pass
    if len(sys.argv) > 1:
        if len(sys.argv) < 5:
            print("Usage: python kernelConvolution.py fileInputLocation [fileOutputLocation|-nosave] numThreads [3|5]")
            return
        else:
            fileInputLocation = sys.argv[1]
            fileOutputLocation = sys.argv[2]
            shouldSave = not (fileOutputLocation == "-nosave")
            numThreads = sys.argv[3]
            kernelSize = sys.argv[4]
            kernel = getDummyKernel(int(kernelSize))
            shouldWriteToTiming = False
            makeGreyScale = False # disable this
    else:
        with open('../transferData/config.json') as f:
            config = json.load(f)

            fileInputLocation = config['fileInputLocation']
            fileOutputLocation = config['pythonOutputLocation']#os.path.join(transferDataDir,"python-" + os.path.basename(inputFile))
            kernel = config['kernel']
            numThreads = config['numThreads']
            makeGreyScale = config['greyScale']
            shouldSave = True
            shouldWriteToTiming = True
            if not fileInputLocation:
                print("invalid file input location")
                return

    nKernel = np.asarray(kernel)
    nKernel = np.flip(nKernel,1)
    #print(nKernel)
    #print(kernel)

    #This copy file function is in place of the filter that has to be written
    #In the implementation, read image from the input file, and write image to output file
    #then replace the 100.01 with the seconds it took to perform the kernel convolution
#     copyfile(inputFile, fileOutputLocation)
    #time = convoluteFileNoParallel(fileInputLocation,fileOutputLocation,kernel, numThreads, makeGreyScale, shouldSave)
    time = None
    if numThreads == 1:
        time = convoluteFileNoParallel(fileInputLocation,fileOutputLocation,nKernel, numThreads, makeGreyScale, shouldSave)
    else:
        time = convoluteFileParallel(fileInputLocation,fileOutputLocation,nKernel, numThreads, makeGreyScale, shouldSave)
    #time = convolute1(fileInputLocation,fileOutputLocation,kernel, numThreads, makeGreyScale, shouldSave)
    print("time: " + str(time))
    #kernel
    if shouldWriteToTiming:
        with open('../transferData/pythonTiming.json', "r+") as pf:
            pythonTiming = json.load(pf)
            pythonTiming['fileOutputLocation'] = fileOutputLocation
            pythonTiming['timing'] = round(time,6)
            pf.seek(0)
            json.dump(pythonTiming, pf)
            pf.truncate()



main()
