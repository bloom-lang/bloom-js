import math
import random
from copy import deepcopy

ENTROPY_THRESHOLD = 0.2

class Node:
    def __init__(self, loc, entropy=float('inf')):
        self.loc = loc
        self.entropy = entropy
        self.class_counts = {}
        self.best_class = ''
        self.feature_num = -1
        self.split_val = float('-inf')
        self.info_gain = 0
        self.leaf = False

def min_entropy_init(cur_node, data_arr):
    return {
        'left_class_counts': {},
        'right_class_counts': cur_node.class_counts,
        'left_count': 0,
        'right_count': len(data_arr),
        'split_val': float('-inf'),
        'min_entropy': {
            'total': float('inf'),
            'left': float('inf'),
            'right': float('inf')
        },
        'prev_split_val': float('-inf'),
        'prev_min_entropy': {
            'total': float('inf'),
            'left': float('inf'),
            'right': float('inf')
        }
    }

def total_class_counts_accum(total_class_counts, datum):
    class_name = datum[-1]
    if class_name not in total_class_counts:
        total_class_counts[class_name] = 0
    total_class_counts[class_name] += 1
    return total_class_counts

def calc_entropy(class_counts, total_count):
    if total_count == 0:
        return 0
    entropy = 0
    for cname in class_counts:
        ent_part = float(class_counts[cname]) / total_count
        if ent_part > 0:
            entropy -= ent_part * math.log(ent_part, 2)
    return entropy

def calc_split_entropy(acc):
    left_entropy = calc_entropy(acc['left_class_counts'], acc['left_count'])
    right_entropy = calc_entropy(acc['right_class_counts'], acc['right_count'])
    total_count = acc['left_count'] + acc['right_count']
    left_prob = float(acc['left_count']) / total_count
    right_prob = float(acc['right_count']) / total_count
    total_entropy = left_prob * left_entropy + right_prob * right_entropy
    return {
        'total': total_entropy,
        'left': left_entropy,
        'right': right_entropy
    }

def min_entropy_accum(acc, datum):
    class_name = datum[-1]
    if class_name not in acc['left_class_counts']:
        acc['left_class_counts'][class_name] = 0
    acc['left_class_counts'][class_name] += 1
    acc['right_class_counts'][class_name] -= 1
    acc['left_count'] += 1
    acc['right_count'] -= 1
    entropy = calc_split_entropy(acc)
    if datum[0] == acc['split_val']:
        if entropy['total'] <= acc['prev_min_entropy']['total']:
            acc['split_val'] = datum[0]
            acc['min_entropy'] = entropy
        else:
            acc['split_val'] = acc['prev_split_val']
            acc['min_entropy'] = acc['prev_min_entropy']
    elif entropy['total'] <= acc['min_entropy']['total']:
        acc['prev_split_val'] = acc['split_val']
        acc['prev_min_entropy'] = acc['min_entropy']
        acc['split_val'] = datum[0]
        acc['min_entropy'] = entropy
    return acc

def train_tree(data_arr):
    num_features = len(data_arr[0]) - 1
    root_node = Node('')
    root_node.class_counts = reduce(total_class_counts_accum, data_arr, {})
    root_node.entropy = calc_entropy(root_node.class_counts, len(data_arr))
    new_nodes = []
    if root_node.entropy == 0:
        root_node.leaf = True
    else:
        new_nodes.append(root_node)
    all_nodes = {'': root_node}
    data_locs = {}
    for i in range(len(data_arr)):
        data_locs[i] = ''
    while len(new_nodes) > 0:
        cur_node = new_nodes.pop()
        cur_node.best_class = max(cur_node.class_counts,
            key=lambda x: cur_node.class_counts[x])
        cur_data_ids = []
        cur_data_arr = []
        for i in range(len(data_arr)):
            if data_locs[i] == cur_node.loc:
                cur_data_ids.append(i)
                cur_data_arr.append(data_arr[i])
        split_vals = []
        init_acc = min_entropy_init(cur_node, cur_data_arr)
        for fnum in range(num_features):
            projected_data = map(lambda x: [x[fnum], x[-1]], cur_data_arr)
            sorted_data = sorted(projected_data, key=lambda x: x[0])
            acc = reduce(min_entropy_accum, sorted_data, deepcopy(init_acc))
            split_vals.append([fnum, acc['split_val'], acc['min_entropy']])
        best_feature = min(split_vals, key=lambda x: x[2]['total'])
        if best_feature[2]['total'] < cur_node.entropy - ENTROPY_THRESHOLD:
            cur_node.feature_num = best_feature[0]
            cur_node.split_val = float(best_feature[1])
            cur_node.info_gain = cur_node.entropy - best_feature[2]['total']
            left_child = Node(cur_node.loc + '0', best_feature[2]['left'])
            right_child = Node(cur_node.loc + '1', best_feature[2]['right'])
            all_nodes[left_child.loc] = left_child
            all_nodes[right_child.loc] = right_child
            for i, datum in enumerate(cur_data_arr):
                if float(datum[cur_node.feature_num]) <= cur_node.split_val:
                    new_loc = left_child.loc
                    class_name = datum[-1]
                    if class_name not in left_child.class_counts:
                        left_child.class_counts[class_name] = 0
                    left_child.class_counts[class_name] += 1
                else:
                    new_loc = right_child.loc
                    class_name = datum[-1]
                    if class_name not in right_child.class_counts:
                        right_child.class_counts[class_name] = 0
                    right_child.class_counts[class_name] += 1
                data_locs[cur_data_ids[i]] = new_loc
            if left_child.entropy <= ENTROPY_THRESHOLD:
                left_child.best_class = max(left_child.class_counts,
                    key=lambda x: left_child.class_counts[x])
                left_child.leaf = True
            else:
                new_nodes.append(left_child)
            if right_child.entropy <= ENTROPY_THRESHOLD:
                # TODO: fix max error
                """
                print best_feature, cur_data_arr
                print cur_node.entropy
                print left_child.loc, left_child.class_counts
                print right_child.loc, right_child.class_counts
                """
                right_child.best_class = max(right_child.class_counts,
                    key=lambda x: right_child.class_counts[x])
                right_child.leaf = True
            else:
                new_nodes.append(right_child)
        else:
            cur_node.leaf = True
    return all_nodes

def classify(all_nodes, datum):
    cur_node = all_nodes['']
    while True:
        if cur_node.leaf == True:
            return cur_node.best_class
        next_loc = cur_node.loc
        if float(datum[cur_node.feature_num]) <= cur_node.split_val:
            next_loc += '0'
        else:
            next_loc += '1'
        cur_node = all_nodes[next_loc]

f = open('iris.data')
raw_data = f.read()
rows = raw_data.strip().split('\n')
all_data = map(lambda x: x.split(','), rows)
training_data = [all_data[i] for i in random.sample(xrange(len(all_data)), 50)]
tree_nodes = train_tree(all_data)
for k in tree_nodes:
    print k, tree_nodes[k].feature_num, tree_nodes[k].split_val
error_count = 0
for row in all_data:
    if row[-1] != classify(tree_nodes, row):
        error_count += 1;
print 'error rate: ', float(error_count) / len(all_data)

