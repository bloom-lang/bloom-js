require 'rubygems'
require 'bud'

module DecisionTree
  ENTROPY_THRESHOLD = 0.2

  state do
    table :training_data, [int :idx] => [real[] :features, text :klass, text :node]
    table :decision_tree, [text :node] => [int :feature_idx, real :split_val]

    scratch :node_klass_freqs, [text :node, text :klass] => [int :freq]
    scratch :node_freqs, [text :node] => [int :freq]
    scratch :node_klass_entropies, [text :node, text :klass] => [real :entropy]
    scratch :node_entropies, [text :node] => [real :entropy]
    scratch :training_pairs, [int :lid, int :rid] => [real[] :lfeatures, real[] :rfeatures, text :klass, text :node]
    scratch :node_fval_memo, [text[] :key] => [int :val]
    scratch :node_fval_freqs, [text :node, int :feature_idx, real :split_val] => [int :freq]
    scratch :node_branch_klass_memo, [text[] :key] => [int :val]
    scratch :overcounted_freqs, [text :node, int :feature_idx, real :split_val, int :branch, text :klass] => [int :freq]
    scratch :node_branch_klass_freqs, [text :node, int :feature_idx, real :split_val, int :branch, text :klass] => [int :freq]
    scratch :node_branch_freqs, [text :node, int :feature_idx, real :split_val, int :branch] => [int :freq]
    scratch :node_branch_klass_entropies, [text :node, int :feature_idx, real :split_val, int :branch, text :klass] => [real :entropy]
    scratch :node_branch_entropies, [text :node, int :feature_idx, real :split_val, int :branch] => [real :entropy]
    scratch :node_branch_probs, [text :node, int :feature_idx, real :split_val, int :branch] => [real :prob]
    scratch :node_branch_probtropies, [text :node, int :feature_idx, real :split_val, int :branch] => [real :probtropy]
    scratch :node_feature_entropies, [text :node, int :feature_idx, real :split_val] => [real :entropy]
    scratch :best_features, [text :node] => [int :feature_idx, real :split_val, real :entropy]
  end

  bloom do
    node_klass_freqs <= training_data.group([:node, :klass], count(:idx))
    node_freqs <= node_klass_freqs.group([:node], sum(:freq))
    node_klass_entropies <= (node_klass_freqs*node_freqs).pairs({:node=>:node}) do |nkf, nf|
      prob = nkf.freq.to_f / nf.freq
      [nkf.node, nkf.klass, -prob * Math.log(prob) / Math.log(2)]
    end
    node_entropies <= node_klass_entropies.group([:node], sum(:entropy))
    node_fval_memo <= training_data.reduce({}) do |memo, td|
      td.features.each_with_index do |e, i|
        memo[[td.node, i, e.to_f]] ||= 0
        memo[[td.node, i, e.to_f]] += 1
      end
      memo
    end
    node_fval_freqs <= node_fval_memo do |t|
      if (t.val > 0)
        t.to_a.flatten
      else
        ['blah']
      end
    end
    training_pairs <= (training_data*training_data).pairs({:node=>:node}) do |tdl, tdr|
      [tdl.idx, tdr.idx, tdl.features, tdr.features, tdr.klass, tdl.node]
    end
    node_branch_klass_memo <= training_pairs.reduce({}) do |memo, tp|
      tp.lfeatures.each_with_index do |e, i|
        lval = e.to_f
        if tp.rfeatures[i].to_f <= lval
          memo[[tp.node, i, lval, 0, tp.klass]] ||= 0
          memo[[tp.node, i, lval, 0, tp.klass]] += 1
        else
          memo[[tp.node, i, lval, 1, tp.klass]] ||= 0
          memo[[tp.node, i, lval, 1, tp.klass]] += 1
        end
      end
      memo
    end
    overcounted_freqs <= node_branch_klass_memo {|t| t.to_a.flatten}
    node_branch_klass_freqs <= (overcounted_freqs*node_fval_freqs).pairs({:node=>:node, :feature_idx=>:feature_idx, :split_val=>:split_val}) do |of, nff|
      [of.node, of.feature_idx, of.split_val, of.branch, of.klass, of.freq / nff.freq]
    end
    node_branch_freqs <= node_branch_klass_freqs.group([:node, :feature_idx, :split_val, :branch], sum(:freq))
    node_branch_klass_entropies <= (node_branch_klass_freqs*node_branch_freqs).pairs({:node=>:node, :feature_idx=>:feature_idx, :split_val=>:split_val, :branch=>:branch}) do |nbkf, nbf|
      prob = nbkf.freq.to_f / nbf.freq
      [nbkf.node, nbkf.feature_idx, nbkf.split_val, nbkf.branch, nbkf.klass, -prob * Math.log(prob) / Math.log(2)]
    end
    node_branch_entropies <= node_branch_klass_entropies.group([:node, :feature_idx, :split_val, :branch], sum(:entropy))
    node_branch_probs <= (node_branch_freqs*node_freqs).pairs({:node=>:node}) do |nbf, nf|
      [nbf.node, nbf.feature_idx, nbf.split_val, nbf.branch, nbf.freq.to_f / nf.freq]
    end
    node_branch_probtropies <= (node_branch_entropies*node_branch_probs).pairs({:node=>:node, :feature_idx=>:feature_idx, :split_val=>:split_val, :branch=>:branch}) do |nbe, nbp|
      [nbe.node, nbe.feature_idx, nbe.split_val, nbe.branch, nbe.entropy * nbp.prob]
    end
    node_feature_entropies <= node_branch_probtropies.group([:node, :feature_idx, :split_val], sum(:probtropy))
    best_features <= node_feature_entropies.argmin([:node], :entropy) #.argmin([:node], :feature_idx).argmin([:node], :split_val)
    decision_tree <= (best_features*node_entropies).pairs({:node=>:node}) do |bf, ne|
      if ne.entropy <= ENTROPY_THRESHOLD
        [bf.node, -1, -1.0/0.0]
      else
        [bf.node, bf.feature_idx, bf.split_val]
      end
    end
    training_data <+- (training_data*decision_tree).pairs({:node=>:node}) do |td, dt|
      new_node = td.node
      if dt.feature_idx != -1
        if td.features[dt.feature_idx].to_f <= dt.split_val
          new_node = new_node + '0'
        else
          new_node = new_node + '1'
        end
      end
      [td.idx, td.features, td.klass, new_node]
    end
    stdio <~ decision_tree.inspected
  end

end

